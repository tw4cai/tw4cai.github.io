"use strict";
var PlaybarWDGT = { 
    onLoad: function(){ 
        if ( ! this.captivate ){ 
            return; 
        } 
		
		//Remove outline from focused items
		$(document).find("*").css("outline","none");

		sessionStorage.setItem("lessonXML", "");	
		sessionStorage.setItem("lastNavigatedSlideNum", "");
		
		//
		// locals 
		//
		var _gld; // golbalLessonData reference
						
		// windows
		var _helpWindow = null; 
		
		// wart flags
		var _slideHasRepeatWart = false;
		var _slideHasQuestionWart = false;
		var _slideHasMenuWart = false;
		
		// flag to let us know we are on the last page/slide of a topic
		var _onLastTopicSlide = false;

		// current info about the current lesson, topic, slide, etc...
		var _currentLessonType = "";
		var _currentTopicID = "";
		var _currentSlideNum = -1;
		var _currentSlideLabel = "";
		var _currentSlideData = null;
		var _extendedSlideData = null;
		
		// to keep track of where we go when we hit Back/Forward
		// mainly to support Branching/Remediation etc... where we cannot just do NextSlide/PreviousSlide
		var _slideNumBack = -1;
		var _slideNumForward = -1;
		
		//lockStep support
		//
		// fps of the Captivate movie, need to know this so we can calculate correct buffers etc...
		var _captivateMovieFPS = -1;
		// the buffer (in frames) allowed to reach at the end of a slide to count as complete
		var _frameEndBuffer = -1;
		// the total frames a slide needs to be greater than in order to trigger lock step
		var _frameTotalNoLockStep = -1;
		// total frames for the slide we are on
		var _slideTotalFrames = -1;
		// last first of a slide
		var _slideStartFrame = 0;
		// last frame of the slide
		var _slideStopFrame = 0;
		// flag to let us know if the debug hotspots have already been setup or not
		var blnDebugSetupDone = false;
		
		// flag to let us know if the PlaybarButton clips have already been setup or not (only need to do it once)
		var blnPlaybarButtonSetupDone = false;
	

        // get captivate movie props reference  
		this.movieProps = this.captivate.CPMovieHandle.getMovieProps();  
        if ( ! this.movieProps ){ 
            return; 
        } 

        // get any custom widget params xml - returns an xml string
        this.widgetParams = this.captivate.CPMovieHandle.widgetParams();

        // get captivate variable handle
        this.varHandle = this.movieProps.variablesHandle; 
        // get captivate event handle
        this.eventDisp = this.movieProps.eventDispatcher; 
   
		// instantiate the GlobalLessonData class, set props and load lesson data
		this.globalLessonData = new GlobalLessonData();
		this.globalLessonData.loadLessonData(this);
		this.globalLessonData.loadJulianDateFile();
		this.globalLessonData.CaptivateMovieHandle = this.captivate.CPMovieHandle;
		this.globalLessonData.CaptivateVarsHandle = this.varHandle;
		this.globalLessonData.WidgetPlaybar = this;
			
		_gld = this.globalLessonData;


		
		// playbar root
		this.eventDisp.addEventListener(this.eventDisp.VARIABLECHANGEDEVENT,function(e){
			
            if(e.Data.varName == "cpInfoCurrentFrame"){			
				if(this.frameHasChanged != null) this.frameHasChanged(e.Data.newVal);				
			}
        }.bind(this));
		
		
		this.eventDisp.addEventListener(this.eventDisp.QUESTION_SUBMIT_EVENT,function(e){
			// add an attribute the the XML element associated with the current slide
			// to show if the question has been previously answered
			var slideID = _gld.CaptivateSlideData[e.Data.slideNumber].title;
			
			if(slideID != null){
				var questionNode = $(_gld.XmlData).find("page[slideID=" + slideID + "]");				
				if(questionNode.length > 0){
					questionNode = questionNode[0];					
					questionNode.setAttribute("wasAnswered", true);					
				}
			}

        }.bind(this));
					
		this.eventDisp.addEventListener(this.eventDisp.SLIDE_ENTER_EVENT,function(e){			
            this.init();
        }.bind(this));

		this.init = function(){
			//console.log("init");
		
			// init member variables
			_onLastTopicSlide = false;
			_currentLessonType = "";
			_currentTopicID = "";
			_currentSlideNum = -1;
			_currentSlideLabel = "";
			_currentSlideData = null;
			_slideHasRepeatWart = false;
			_slideHasQuestionWart = false;
			_slideHasMenuWart = false;
			

			$("#helpButton").prop("disabled", false);
			$("#exitButton").prop("disabled", false);
		
			//Remove outline on focused/clicked items
			$(window.parent.document).find("*").css("outline", "none");

			if((this.varHandle != null) && (this.globalLessonData.XmlData != null)){

				// grab the lessonType attribute from the global lesson data object
				_currentLessonType = _gld.LessonType.toLowerCase();

				// grab the slide number and slide label from Captivate movie
				_currentSlideNum = this.varHandle.cpInfoCurrentSlide;
				_currentSlideLabel = this.varHandle.cpInfoCurrentSlideLabel;
				// now get the slide data object for this slide
				_currentSlideData = _gld.CaptivateSlideData[_currentSlideNum - 1];
				_extendedSlideData = getSlideData();

				// calculate the total frames for this slide, 
				// this MAY possibly be used to determine if we need to disable the forward arrow or not
				//_slideTotalFrames = (_currentSlideData.stopFrame - _currentSlideData.startFrame) + 1;
				
				_slideStartFrame = _extendedSlideData.from;
				_slideStopFrame = _extendedSlideData.to;
				
				_slideTotalFrames = (_slideStopFrame - _slideStartFrame) + 1;

				//_slideTotalFrames = _currentSlideData.length || 0;
				// calculate our end buffer and frames needed to trigger LockStep
				// the hardcoded 3 used here is for our current default setting of 3 seconds for a normal slide
				// if that default time were to change, the 3 would need to be changed here to match
				_captivateMovieFPS = this.varHandle.cpInfoFPS;
				_frameEndBuffer = _captivateMovieFPS / 3;
				_frameTotalNoLockStep = (_captivateMovieFPS * 3) + _frameEndBuffer;

				// check for our current 'warts' we support
				//  '_rpt' : means the Repeat button should be on for this slide
				//  '_q'   : question slide that needs the Forward/Back buttons disabled
				//  '_i'   : interaction slide (menu style) that needs the Forward button disabled until all menu options have been visited
				_slideHasRepeatWart = _currentSlideLabel.toLowerCase().indexOf("_rpt") != -1;
				_slideHasQuestionWart = _currentSlideLabel.toLowerCase().indexOf("_q") != -1;
				_slideHasMenuWart = _currentSlideLabel.toLowerCase().indexOf("_i") != -1;
				
				// debug info
				//console.log("[playbar_live.as] init; _currentLessonType = " + _currentLessonType);
				//console.log("[playbar_live.as] init; capVarsHandle.cpInfoCurrentSlide = " + _currentSlideNum);
				//console.log("[playbar_live.as] init; capVarsHandle.cpInfoCurrentSlideLabel = " + _currentSlideLabel);
				// should be no way for this to be null if we have made it here, but still want to check
				if (_currentSlideData != null) {
					//console.log("[playbar_live.as] init; _slideTotalFrames = " + _slideTotalFrames);
				}
				//console.log("[playbar_live.as] init; _captivateMovieFPS = " + _captivateMovieFPS);
				//console.log("[playbar_live.as] init; _frameEndBuffer = " + _frameEndBuffer);
				//console.log("[playbar_live.as] init; _frameTotalNoLockStep = " + _frameTotalNoLockStep);
				// end debug info


				// for review purposes, put the current slide label (name) in our slide label textField on the navBar
				// the visibility of this textField is controlled via a hotspot on the lower left screw of the navBar area
				$("#currentSlide").text(_currentSlideLabel + " (" + _currentSlideNum + ")");
				// MIL/CAI specific code (meaning we dont do this code when in EXAM mode, code for EXAM mode is below)
				if ((_currentLessonType == "mil") || (_currentLessonType == "cai")) {
					// make sure exam related textfields are hidden 
					$("#questionID").hide();
					$("#questionCount").hide();
					$("#examDate").hide();
					$("#examTime").hide();
				
					if (_currentSlideNum == 1) {
						$("#mainMenuButton").prop("disabled", true);
						$("#backButton").prop("disabled", true);
						$("#forwardButton").prop("disabled", true);	

						// also set the bottom text fields
						$("#topicTitle").text("");
						$("#pageCount").text("");
						$("#reference").text("");
						$("#screenTitle").text("Main Menu");
						$("#julianDate").css("font-weight","bold").show();
						
						var jdUpdate = setInterval(function(){
							if(_gld.JulianDate != "{unknown}"){
								clearInterval(jdUpdate);
								$("#julianDate").text(_gld.JulianDate);
							}else{
								$("#julianDate").text("00000");
							}
						},100);
						
					}else{
						
						// ok, so we are on a slide other than the mainMenu, so we need to figure out what page we
						// are on, and then grab all the title info for that page, as well as page index for the counter, etc...
						
						var topicNode = null;
						var topicError = false;
						var topicMainTitle = "";
						var topicNavTitle = "";
						var topicBottomTitle = "";
						var topicRefText = "";
						
						// 22jan204 ed: adding a new attribute to <topic> nodes to help identify if the topic is a Progress Check or not
						// we need this information so we can configure the interface correctly when the user has started a Progress Check
						// which in this case it means we need to disable the NavMenu and MainMenu buttons, so the user cannot travel backwards
						// in the lesson once they have committed to starting the Progress Check
						var topicIsProgressCheck = false;				
						
						var pageParentNode = null;
						var pageParentType = "";

						var pageIndex = -1;
						var pageNavTitle = "";
						var pageScreenTitle = "";
						var pageBottomTitle = "";
						var pageRefText = "";
						
						var totalPages = 0;
						var disableBackArrow = false;
					
								
						// julian date only shown on main menu slide
						$("#julianDate").hide();
						
						// TODO: 22aug2013 ed: really should change this so that what we do is first find the page node within the XML, and then if
						// we do indeed find a SINGLE matching page node, then we search our ancestor tree until we find the topic node that
						// the page belongs too, this will eliminate the reliance on the string matching of the first 3 characters
										
						// determine the topic we are in via the slide label (ie t01p003)
						// we dont actually care about the number, just that the first 3 characters of the slide id match the topic id
						_currentTopicID = _currentSlideLabel.substr(0, 3);
						
						//console.log("[playbar_live.as] init; _currentTopicID = " + _currentTopicID);
						
						
						// attempt to grab the topic node from the xml			
						try {
							//topicNode = _gld.XmlData.topic.(@topicID == _currentTopicID);
							topicNode = $(_gld.XmlData).find("topic[topicID=" + _currentTopicID + "]")[0];
						} catch(e) {
							//console.log("[playbar_live.as] init; failed to retrieve topicNode! e: " + e);
						}
						// make sure we have a topic node
						if (topicNode != null) {
							try {
								
								// get the titles for this topic, then we will clean them up
								topicMainTitle = topicNode.getAttribute("mainMenuTitle");
								topicNavTitle = topicNode.getAttribute("navMenuTitle");
								topicBottomTitle = topicNode.getAttribute("bottomTitle");
								topicRefText = topicNode.getAttribute("refText");
								
								// handle any placeholders in the topic attributes
								topicNavTitle = topicNavTitle.replace("{tmain}", topicMainTitle);
								topicBottomTitle = topicBottomTitle.replace("{tmain}", topicMainTitle);
								
								// 22jan2014 ed: check for the new topicIsProgessCheck attribute
								if (topicNode.getAttribute("topicIsProgressCheck") == "yes") {
									topicIsProgressCheck = true;
								} else {
									topicIsProgressCheck = false;
								}
								
								//console.log("[playbar_live.as] init; topicNavTitle = " + topicNavTitle);
								//console.log("[playbar_live.as] init; topicBottomTitle = " + topicBottomTitle);
								//console.log("[playbar_live.as] init; topicRefText = " + topicRefText);
								//console.log("[playbar_live.as] init; topicIsProgressCheck = " + topicIsProgressCheck);
								
							} catch(e) {
								topicError = true;
								//console.log("[playbar_live.as] init; failed while processing topic info!");
							}
											
						
							// a little defensive coding just in case we didn't process the topic node successfully
							if (topicError == false) {
							// if we have made it here then we should be good to go with processing all
							// the page info: titles, index, etc...
							
								try {
									// get the page node
																		
									var pageNode = $(topicNode).find("page[slideID='" + _currentSlideLabel + "']");
									if (pageNode.length == 1) {
										pageNode = pageNode[0];		
										
										// great, we found a matching page node, lets get all the title info
										pageNavTitle = pageNode.getAttribute("navMenuTitle");
										pageScreenTitle = pageNode.getAttribute("screenTitle");
										pageBottomTitle = pageNode.getAttribute("bottomTitle");
										pageRefText = pageNode.getAttribute("refText");
										
										// handle any placeholder text in the refText
										pageRefText = pageRefText.replace("{topic}", topicRefText);
										
										// then we will clean them up if required
										pageScreenTitle = pageScreenTitle.replace("{nav}", pageNavTitle);
										pageBottomTitle = pageBottomTitle.replace("{nav}", pageNavTitle);
										
										
										// get the page index, padded by 1 because its zero based
										pageIndex = getIndex(pageNode);
										
										if(pageIndex == -1){
											//console.log("ERROR: Cannot get index from element");
											return;
										}else{
											pageIndex += 1;
										}
										
										// figure out what slide to jump to when navigating Back
										_slideNumBack = _gld.getPrevSiblingSlideNum(pageNode);
																	
										
										// now lets grab the parent node of the pageNode because it will affect
										// some ui items depending on where this pageNode exists in the hierarchy
										pageParentNode = pageNode.parentNode;
										// note: the documentation for 'parent()' is important here, "Returns the parent of the XMLList object if all items in the XMLList 
										// object have the same parent. If the XMLList object has no parent or different parents, the method returns undefined."
										// we should be good here since we should only be in this block of code if we ONLY have a single node in our XMLList
										// and the only way that a single pageNode would end up without a parent (in our current design) is if the
										// lesson data xml file is malformed, but will still check for null or undefined here
										if (pageParentNode != null) {
											// get the parent type string, should be: "topic", "page", or "branch"
											pageParentType = pageParentNode.nodeName;
											//console.log("[playbar_live.as] init; pageParentType: " + pageParentType);
											
											// now lets get the total pages for this parent
											totalPages = pageParentNode.childElementCount;											
											
											// see if this pageNode is the last page of this parent
											if (pageIndex == totalPages) {
												// set the 'isComplete' attribute for this parent, will be used by different code
												// to determine if the topic/branch etc... is complete
												pageParentNode.setAttribute("isComplete", "yes");
											
												
												if (pageParentType == "topic") {
													// if parent is <topic>, then we are returning to the Main Menu
													//console.log("_slideNumForward = 0")
													_slideNumForward = 0;
												}
												else if (pageParentType == "branch") {
													//--------------------------------------------------------------------------------------------
													// 09dec2013 ed: found a unique circumstance where an Additional Info path was at the end of a
													// menu path, and in the Authorware lesson it returns to the menu via a navigate icon, but my 
													// current widget implementation did not support this type of navigation, my code would crawl
													// the ancestor chain until it found a valid nextSibling or the <topic> node containing this page
													//
													// so this is my quick fix for this:
													//  1. wrap the AI pages in a <branch> node
													//  2. give the <branch> node this attribute branchID="BranchEndAI"
													//  3. then attach a second attribute returnID="slideLabel"
													//
													// number 3 should contain the slide label that we want to return to, which most likely would be
													// the _i slide that contains our parents branch, but technically it can be any slide label that
													// exists in the lesson data xml 
													if (pageParentNode.getAttribute("branchID") == "BranchEndAI") {
														//console.log("[playbar_live.as] init; *** found special branch parent node ***");
													
														// we have found one of the special AI branches described above, so lets find the <page>
														// that we need to return to via the returnID attribute
														var returnSlideID = pageParentNode.getAttribute("returnID");
														// now lets attempt to find the matching <page> node in the LDX
														var returnPageNode = $(_gld.XmlData).find("page[slideID=" + returnSlideID + "]");
														// make sure we found something
														if (returnPageNode.length > 0) {
															// good, now just grab the slideNum attribute from the <page> node we found
															// console.log("_slideNumForward = returnPageNode.getAttribute(slideNum)")
															_slideNumForward = returnPageNode[0].getAttribute("slideNum");
															
														}
														else {
															// bad, so lets just continue with how the navigation used to work, but dump some info
															// that may be useful in the debugWindow
															// console.log("_slideNumForward = _gld.getNextSiblingSlideNum(pageNode);")
															_slideNumForward = _gld.getNextSiblingSlideNum("pageNode");
															//console.log("[playbar_live.as] init; returnSlideID '" + returnSlideID + "' not found in the LDX!");
														}
													
													} else {
														// if parent is regular <branch>, then we are returning to the Branch Menu (_i slide)
														var actualBranchParent = pageParentNode.parentNode;
														// console.log("_slideNumForward = actualBranchParent.getAttribute(slideNum);")
														_slideNumForward = actualBranchParent.getAttribute(slideNum);
													}
												} else {

													// let the getNextSibling function figure it out for all other parent types
													_slideNumForward = _gld.getNextSiblingSlideNum(pageNode);

													// 29aug2013 ed: replacing this section, now that the getNextSibling function has been tweaked
													// to work better, but leaving this here for now to remind me how it used to be done
													/*
													// if parent is <page>, then we are returning to the parents next sibling, IF it has
													// one, if not then getNextSiblingSlideNum will take care of climbing up the tree until we either
													// find an ancestor with a nextSibling or we reach the top level topic node, which in that
													// case we will be returning to the Main Menu (via setting _slideNumForward to 0 below)
													if (pageParentType == "page") {
														_slideNumForward = _gld.getNextSiblingSlideNum(pageParentNode);
													}
													*/
												}
												
											} else {	
										
												// figure out what slide to jump to when navigating Forward and we are not
												// on the last slide of a parent (topic/branch/page) path
												//console.log('set _slideNumForward 3');
												_slideNumForward = _gld.getNextSiblingSlideNum(pageNode);
											}
											
											// so if we have made it to here, and _slideNumForward equals -1, then we did
											// not actually find a nextSibling, so we need to just return to the Main Menu
											if (_slideNumForward == -1) {
												//console.log("[playbar_live.as] init; _slideNumForward equals -1 so setting to 0!");
												// console.log("_slideNumForward = 0; a")
												_slideNumForward = 0;
											}

											//console.log("[playbar_live.as] init; _slideNumBack: " + _slideNumBack);
											//console.log("[playbar_live.as] init; _slideNumForward: " + _slideNumForward);
											
										} else {
											//console.log("[playbar_live.as] init; pageParentNode is null!");
										}

									} else {
										// console.log("[playbar_live.as] init; pageNode.length != 1, it == " + pageNode.length);
									}
								} catch(e) {
									// console.log("[playbar_live.as] init; failed while processing page info!");
								}
							}
						} else {
							// console.log("[playbar_live.as] init; topicNode not found!");
						}
					
						// for now, we have it set that the Main Menu button is always enabled as long as we
						// are not on the Main Menu screen (in other words, no 'wart' to tell us to turn it off)
						// 22jan2014 ed: a new attribute has been added to <topic> nodes to tell us if we are in a Progress Check,
						// if we are then we need to disable the MainMenu and NavMenu buttons when we are on Question slide within that topic
						if ((_slideHasQuestionWart == true) && (topicIsProgressCheck == true) && (_gld.LessonIsLockStep == true)) {
							$("#mainMenuButton").prop("disabled", true);
						}
						else {
							$("#mainMenuButton").prop("disabled", false);
						}
						
						// Forward Button. within Progress Check page Results then disable Back btn
						if (pageBottomTitle == "Results"){
							$("#backButton").prop("disabled", true);
						}
						
						// check for Question/Interaction warts OR LockStep status
						if (((_slideHasQuestionWart == false) && (_slideHasMenuWart == false)) || (_gld.LessonIsLockStep == false)) {
							//-------------------------------
							// 26sep2013 ed: LockStep support
							// we may have fallen in here by not finding a Question wart and not finding an interaction wart
							// if that is the case, then we still want to check for LockStep status so we don't enable the Forward
							// button unless LockStep has been turned off, meaning someone used Shift-F8 function or the lesson is a MIL
							// if we are in LockStep mode, then the Forward button status will be handled where we determine if the Slide
							// has completed playing etc... in the frameHasChanged function below
							
							if (_gld.LessonIsLockStep == false) {
								$("#forwardButton").prop("disabled", false);
							} else {
								// we are in LockStep, but lets check here if we are a 'normal' slide that does not need LockStep
								// meaning the timeline length is less that our defined normal length which is currently 3 seconds, note that i
								// have added a little wiggle room so its actually like 3.3 seconds, see above where _frameTotalNoLockStep is calculated
								if (_slideTotalFrames < _frameTotalNoLockStep) {

									$("#forwardButton").prop("disabled", false);
								} else {
									$("#forwardButton").prop("disabled", true);
								}
							}
						
							// Back button has extra logic below
							disableBackArrow = false;
						
						} else {
							// if it is a Question, then we are disabling the Forward and Back arrow
							// BUT only if the Question has not been answered yet
							if (_slideHasQuestionWart == true) {
								if (_gld.wasQuestionAnswered() == false) {
									//console.log("[playbar_live.as] init; disabling BOTH forward and back buttons!");
									$("#forwardButton").prop("disabled", true);
									// Back button has extra logic below
									disableBackArrow = true;
								} else {
									// enable Forward arrow since question has been answered
									$("#forwardButton").prop("disabled", false);
									// Back button has extra logic below
									disableBackArrow = false;
								}							
							}
											
							// if it is a Menu type, then we need to check for Completion in order
							// to determine the Forward arrow status
							if (_slideHasMenuWart == true) {
								// for 'interactive' slides (menu type), we are making the Forward buttons disabled until all
								// child paths have been visited
								if (_gld.checkParentComplete(pageNode) == true) {
									$("#forwardButton").prop("disabled", false);
								}else {
									$("#forwardButton").prop("disabled", true);
								}							
							}					
						}	

						// make sure we have made it here with a valid page indexP
						if (pageIndex > 0) {
							// back button is disabled if we are on the first slide of a topic or branch, no matter what
							if (pageIndex == 1) {
								$("#backButton").prop("disabled", true);			
							}else {
								// if we are not on slide 1, then something above may have dictated Back arrow behavior
								if (disableBackArrow == true) {
									$("#backButton").prop("disabled", true);
								} else {
									$("#backButton").prop("disabled", false);
								}
							} 
							
							// set the playbar strings
							$("#topicTitle").text(topicBottomTitle);
							$("#pageCount").text("Page " + pageIndex + " of " + totalPages);
							$("#screenTitle").text(pageBottomTitle);
							$("#reference").text(pageRefText);
							
							// set the slide content title (screen title) via a user variable inside Captivate
							// it is assumed that the user variable is already placed in a text caption on the Slide
							// DD: this is not property of the vars handle.  this may be a way to store dynamic values, but I
							// don't see this prop used anywhere
							this.varHandle.uv_Content_Slide_Title = pageScreenTitle;
						} else {
							// if we are here, then something has failed above, which someone can see what happened by
							// looking at the debugWindow output, however i also want to display something in the Playbar
							// that makes it obvious that an error has happened without having to look in the debugWindow
							$("#pageError_txt").text("ERROR: slide label '" + _currentSlideLabel + "' not found in LDXML!     pageIndex = " + pageIndex + "     currentSlideNum = " + _currentSlideNum);
							$("#pageError_txt").show();
						}
					}
					
					// determine if we need to show or hide the Repeat button
					if (_slideHasRepeatWart == true) {
						$("#repeatButton").prop("disabled", false);
					} else {
						$("#repeatButton").prop("disabled", true);
					}
					
					// determine if we need to show or hide the Resume button
					// the GlobalLessonData object has a public variable exposed that will let us
					// know if we have a 'Resume' slide number stored or not
					var resumeSlideNum = sessionStorage.getItem("resumeSlideNum"); 					
					if ((resumeSlideNum == "") || (resumeSlideNum == -1) || (resumeSlideNum == _currentSlideNum - 1)){
						resumeSlideNum = -1;
						$("#resumeButton").prop("disabled", true);
					} else {
						$("#resumeButton").prop("disabled", false);
					}
					
					// Forward Button. within Progress Check page Results then disable Back btn
					if (pageBottomTitle == "Results"){
						$("#backButton").prop("disabled", true);
					}
			
			
					//-----------------------------------------------------------------------------------------------
					// end: MIL and CAI only
					//-----------------------------------------------------------------------------------------------
				}else if (_currentLessonType == "exam") {
					//-----------------------------------------------------------------------------------------------
					// begin: EXAM only
					//-----------------------------------------------------------------------------------------------
					
					// exams work a little different than mil & cai
					// the navigate, main menu, repeat, and resume buttons are always disabled (as far as we can tell so far)					
					$("#mainMenuButton").prop("disabled", true);
					$("#repeatButton").prop("disabled", true);
					$("#resumeButton").prop("disabled", true);
					
					// hide CAI/MIL only textFields
					$("#topicTitle").hide();
					$("#pageCount").hide();
					$("#screenTitle").hide();
					$("#julianDate").hide();

					// the exam doesnt really have a main menu slide, but it does have a 'start' slide, so we
					// dont want the Forward button to be enabled on slide 1 ...
					if (_currentSlideNum == 1) {
						$("#forwardButton").prop("disabled", true);
					} else {

						$("#forwardButton").prop("disabled", false);
					}
					
					// ... and we dont want the Back button to be enabled on slide 1 or slide 2 (which would be the first question)
					if (_currentSlideNum < 3) {
						$("#backButton").prop("disabled", true);
					} else {
						$("#backButton").prop("disabled", false);
					}

					// if we are on any slide past the final question, no Forward or Back button			
					if (_currentSlideNum > capVarsHandle.cpQuizInfoTotalQuestionsPerProject + 1) {
						$("#backButton").prop("disabled", true);
						$("#forwardButton").prop("disabled", true);
					}
				
					// if we are on an Exam Question slide show the bottom UI text info: ID, Count, Date, and Time
					if ((_currentSlideNum > 1) && (_currentSlideNum < this.varHandle.cpQuizInfoTotalQuestionsPerProject + 2)) {
						// when using Random Question slides, Captivate does not transfer the SlideLabel of the Pool Question Slide
						// to the Random Question Slide, so cannot rely on cpInfoCurrentSlideLabel (see info in the GLD function)
						$("#questionID").text("Question ID: " + _gld.hardToGetSlideLabel());
						$("#questionCount").text("Question " + (_currentSlideNum - 1) + " of " + this.varHandle.cpQuizInfoTotalQuestionsPerProject);
						$("#examDate").show();
						$("#examTime").show();
						
					} else {

						$("#examDate").hide();
						$("#examTime").hide();
						$("#questionID").text("");
						$("#questionCount").text("");
					}
					
					// wire up the date/time ticker	
					// DD: This interval is never stopped in the original					
					this.setInterval(function(){
						
						// date sample: 5/17/2013   time sample: 8:54:31 AM
						var todaysDate = new Date();
						var hourNum = todaysDate.getHours();
						var hourStr;
						var modifier;
						
						if (hourNum > 12) {
							hourStr = (hourNum - 12).toString();
							modifier = " PM";
						}
						else if (hourNum == 0) {
							hourStr = "12";
							modifier = " AM";
						}
						else if (hourNum == 12) {
							hourStr = "12";
							modifier = " PM";
						}
						else if (hourNum < 12) {
							hourStr = hourNum.toString();
							modifier = " AM";
						}
						
						$("#examDate").text((todaysDate.getMonth() + 1) + "/" + todaysDate.getDate() + "/" + todaysDate.getFullYear());
						$("#examTime").text(hourStr + ":" + doubleDigitFormat(todaysDate.getMinutes()) + ":" + doubleDigitFormat(todaysDate.getSeconds()) + modifier);
						
					}, 100);
				
					//-----------------------------------------------------------------------------------------------
					// end: EXAM only
					//----------------
				}
				
			}else{
				// console.log("[playbar_live.as] init; ***** Either capVarsHandle or _gld.XmlData is null! *****");
			}
			
			//----------------------------------------------------------------------------------------------------------------------
			// now that we have the Playbar Widget set to 'Display for Rest of Project' we are not starting fresh each time the init
			// function gets called, so only need to setup the PlaybarButtons and debug stuff once, not every time init is called 
			// which will be on every slide change in Captivate
			
			if (blnPlaybarButtonSetupDone == false) {
				this.setupPlaybarButtons();
			}

			if (blnDebugSetupDone == false) {
				$("#showLabelsHotspot").click(this.onToggleCurrentSlideLabelVisibilityClick.bind(this));
				$("#showLabelsHotspot").css("cursor", "default");

				// set our flag to true, so this code wireup code is only executed once		
				blnDebugSetupDone = true;
			
			}
			//----------------------------------------------------------------------------------------------------------------------
			
			var xmlText = new XMLSerializer().serializeToString(_gld.XmlData);
			sessionStorage.setItem("lessonXML", xmlText);
		}
		
		this.frameHasChanged = function(frameNum) {
			window.parent["percent_scored2"] = Math.floor(window.parent["percent_scored2"]);

			// make sure we have access to the globalLessonData
			if (_gld != null) {
				// if we are not in LockStep mode, just bail
				//if (_gld.LessonIsLockStep == false) return;
				if (_gld.LessonType != "CAI") return
				// if we are on a Question Slide, just bail
				if (_slideHasQuestionWart == true) return;
				// if we are on a Menu Slide, just bail
				if (_slideHasMenuWart == true) return;
				

			
				//dbgText("[playbar_live.as] frameHasChanged; LessonIsLockStep must be true!");
			
				// check if this slide is greater than our required length to trigger LockStep
				// right now we are setting this requirement at greater that 3.3 seconds approx.

				if (frameNum >= (_slideStopFrame - _frameEndBuffer)) {
					// if it is longer than that then we will not enable the Forward button until we
					// have reached the end of the slide minus the allowed buffera
					if (frameNum >= (_slideTotalFrames - _frameEndBuffer)) {
					
						if (_currentSlideNum != 1) $("#forwardButton").prop("disabled", false);
					}
				}
			}
		}
				
		
		//
		// main button event handling
		//
		this.setupPlaybarButtons = function() {
			$("#mainMenuButton").click(this.onMainMenuButtonClick.bind(this));
			$("#helpButton").click(this.onHelpButtonClick.bind(this));
			$("#backButton").click(this.onBackButtonClick.bind(this));
			$("#repeatButton").click(this.onRepeatButtonClick.bind(this));
			$("#forwardButton").click(this.onForwardButtonClick.bind(this));
			$("#resumeButton").click(this.onResumeButtonClick.bind(this));
			$("#exitButton").click(this.onExitButtonClick.bind(this));
					
			// now set the flag to true so we dont execute the PlaybarButton setup code again
			blnPlaybarButtonSetupDone = true;
		}

		this.onMainMenuButtonClick = function(e){
			//console.log("[playbar_live.as] handleMainMenuClick; this = " + this);

			if (this.varHandle != null) {
				//console.log("[playbar_live.as] handleMainMenuClick; totalSlides in movie = " + this.varHandle.cpInfoSlideCount);
				sessionStorage.setItem("resumeSlideNum",this.varHandle.cpInfoCurrentSlide - 1);
				this.varHandle.cpCmndGotoSlide = 0;
				this.varHandle.cpCmndResume = 1;
			}
		}
		
		this.onHelpButtonClick = function(e){

			if (_helpWindow && !_helpWindow["closed"]) {
				_helpWindow.focus();
			} else {
				var width  = 641;
				var height = 461;
				var left = (screen.width/2)-(width/2);
				var top = (screen.height/2)-(height/2);
				
				var params = 'width='+width+', height='+height;
				params += ', top=' + top;
				params += ', left=' + left;
				params += ', directories=no';
				params += ', location=no';
				params += ', menubar=no';
				params += ', resizable=yes';
				params += ', scrollbars=no';
				params += ', status=no';
				params += ', toolbar=no';

				_helpWindow = window.open("../../help/help.html", "_blank", params);
				_helpWindow.focus();
			}
		}
		
		this.onBackButtonClick = function(e){
			//console.log("[playbar_live.as] handleBackClick; this = " + this);
	
			if (this.varHandle != null) {

				// this is the command to simply goto the Previous slide: [this.varHandle.cpCmndPrevious = 1;]
				// but we cannot always use that, so need a specific slide to jump to, which is set in the 'init' function above
				// unless we are in 'exam' mode

				if (_currentLessonType == "exam") {		
					this.varHandle.cpCmndPrevious = 1;
				}
				else {
					if (_slideNumBack != -1) {
						sessionStorage.setItem("lastNavigatedSlideNum", _slideNumBack);
						this.varHandle.cpCmndGotoSlide = _slideNumBack;
						this.varHandle.cpCmndResume = 1;
					}
				}
				
			}
		}
		
		this.onRepeatButtonClick = function(e){
			//console.log("[playbar_live.as] handleRepeatClick; this = " + this);
	
			if (this.varHandle != null) {
				this.varHandle.cpCmndGotoSlide = this.varHandle.cpInfoCurrentSlide - 1;
				this.varHandle.cpCmndResume = 1;
			}
		}
		
		this.onForwardButtonClick = function(e){
			//console.log("[playbar_live.as] handleForwardClick; this = " + this);

			if (this.varHandle != null) {
				// this is the command to simply goto the Next slide: [this.varHandle.cpCmndNextSlide = 1;]
				// but we cannot always use that, so need a specific slide to jump to, which is set in the 'init' function above
				// unless we are in 'exam' mode
				
				if (_currentLessonType == "exam") {		
					this.varHandle.cpCmndNextSlide = 1;
				} else {
					if (_slideNumForward != -1) {

						sessionStorage.setItem("lastNavigatedSlideNum", _slideNumForward);
						this.varHandle.cpCmndGotoSlide = _slideNumForward;
						this.varHandle.cpCmndResume = 1;
					}
				}				
			}
		}
		
		this.onResumeButtonClick = function(e){
			if ((_gld != null) && (this.varHandle != null)) {
				try {
					var slideNum = sessionStorage.getItem("resumeSlideNum");
					if(slideNum == "") return;
					
					sessionStorage.setItem("resumeSlideNum", -1);
					
					this.varHandle.cpCmndGotoSlide = slideNum;
					this.varHandle.cpCmndResume = 1;
					
				}
				catch(e) {
					// just fail silently (for now)
					//console.log(e);
				}			
			}
		}
				
		this.onExitButtonClick = function(e){
			var result = confirm("Are you sure you want to quit");
			
			if(result){				
				if (this.varHandle != null) {
					this.varHandle.cpCmndExit = 1;
				}
			}
		}
		
		this.onToggleCurrentSlideLabelVisibilityClick = function(e){
			$("#currentSlide").toggle();
		}

		//
		// playbar helper functions
		//
		function getIndex(oNode){
			var oParent = oNode.parentNode;
			var children = $(oParent).children();
			for(var i=0; i<children.length; i++){
				if(children[i] == oNode){
					return i;
				}
			}
			return -1;
		}
		function getSlideData(){
			var cpData = window.parent.cp.model.data;
			var index = (window.parent.cpInfoCurrentSlide - 1);
			var slides = cpData.project_main.slides.split(',');
			var slideKey = slides[index];
			var slideData = cpData[slideKey];
			return slideData;
		}
				
    },
    onUnload: function(){ 
        /*Unload your widget here*/
    }
} 

var Playbar = function (){ 
    return PlaybarWDGT; 
}
