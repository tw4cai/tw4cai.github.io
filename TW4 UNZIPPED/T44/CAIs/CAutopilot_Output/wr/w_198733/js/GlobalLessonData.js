"use strict";
(function() {
	
	var _lessonID = "{unknown}";
	var _lessonTitle = "{unknown}";
	var _lessonType = "{unknown}";
	var _allowShowLabel = "{unknown}";
	var _allowDebug = "{unknown}";
	var _lessonIsLockStep = false;
	var _julianDate = "{unknown}";
	var _resumeSlideNum = -1;
	var _showFrameMessages = false;
	var _showSlideDebugMessages = false;
	var _xmlData = null;
	
	// captivate handlers
	var _capMovieHandle = null;
	var _capVarsHandle = null;
	
	// other members
	var _widgetPlaybar = null;
	var _widgetMainMenu = null;
	
	window["GlobalLessonData"] = function GlobalLessonData() {
				
	};
	
	Object.defineProperty(GlobalLessonData.prototype, "XmlData", {
		enumerable: true,
		get: function () { return _xmlData; }
	});	
	Object.defineProperty(GlobalLessonData.prototype, "LessonID", {
		enumerable: true,
		get: function () { return _lessonID; }
	});			
	Object.defineProperty(GlobalLessonData.prototype, "LessonTitle", {
		enumerable: true,
		get: function () { return _lessonTitle; }
	});
	Object.defineProperty(GlobalLessonData.prototype, "LessonType", {
		enumerable: true,
		get: function () { return _lessonType; }
	});
	Object.defineProperty(GlobalLessonData.prototype, "AllowShowLabel", {
		enumerable: true,
		get: function () { return _allowShowLabel; }
	});
	Object.defineProperty(GlobalLessonData.prototype, "AllowDebug", {
		enumerable: true,
		get: function () { return _allowDebug; }
	});
	Object.defineProperty(GlobalLessonData.prototype, "LessonIsLockStep", {
		enumerable: true,
		get: function () { return _lessonIsLockStep; }
	});
	Object.defineProperty(GlobalLessonData.prototype, "JulianDate", {
		enumerable: true,
		get: function () { return _julianDate; }
	});	
	Object.defineProperty(GlobalLessonData.prototype, "ResumeSlideNum", {
		enumerable: true,
		get: function () { return _resumeSlideNum; },
		set: function (value) { _resumeSlideNum = value; }
	});
	Object.defineProperty(GlobalLessonData.prototype, "CaptivateMovieHandle", {
		enumerable: true,
		get: function () { return _capMovieHandle; },
		set: function (value) { _capMovieHandle = value; }
	});
	Object.defineProperty(GlobalLessonData.prototype, "CaptivateVarsHandle", {
		enumerable: true,
		get: function () { return _capVarsHandle; },
		set: function (value) { _capVarsHandle = value; }
	});
	Object.defineProperty(GlobalLessonData.prototype, "CaptivateMovieProps", {
		enumerable: true,
		get: function () { return (_capMovieHandle) ? _capMovieHandle.getMovieProps() : null; }
	});
	Object.defineProperty(GlobalLessonData.prototype, "CaptivateSlideProps", {
		enumerable: true,
		get: function () { return (_capMovieHandle) ? _capMovieHandle.getSlideProps() : null; }
	});
	Object.defineProperty(GlobalLessonData.prototype, "CaptivateSlideData", {
		enumerable: true,
		get: function () { return (_capMovieHandle && _capVarsHandle) ? _capMovieHandle.getCPSlideData(_capVarsHandle.cpInfoCurrentSlide - 1) : null; }
	});
	Object.defineProperty(GlobalLessonData.prototype, "CaptivateContainerProps", {
		enumerable: true,
		get: function () { return (_capMovieHandle) ? _capMovieHandle.getContainerProps() : null; }
	});
	Object.defineProperty(GlobalLessonData.prototype, "WidgetPlaybar", {
		enumerable: true,
		get: function () { return _widgetPlaybar; },
		set: function (value) { _widgetPlaybar = value; }
	});
	Object.defineProperty(GlobalLessonData.prototype, "WidgetMainMenu", {
		enumerable: true,
		get: function () { return _widgetMainMenu; },
		set: function (value) { _widgetMainMenu = value; }
	});
	Object.defineProperty(GlobalLessonData.prototype, "ShowFrameMessages", {
		enumerable: true,
		get: function () { return _showFrameMessages; },
		set: function (value) { _showFrameMessages = value; }
	});
	Object.defineProperty(GlobalLessonData.prototype, "ShowSlideDebugMessages", {
		enumerable: true,
		get: function () { return _showSlideDebugMessages; },
		set: function (value) { _showSlideDebugMessages = value; }
	});
	
	
	GlobalLessonData.prototype.loadLessonData = function(scope) {
	// the lesson XML is saved into session storage by the playbar
	// run an interval until the data is found, then parse and handle the data
	
		var interval = setInterval(function(){
			
			var strLessonXML = sessionStorage.getItem("lessonXML"); 
			
			if(strLessonXML == null || strLessonXML == "") return;			
			// data is found
			//
			// parse the xml string and create the document object
			// check for errors
			try{
				
				_xmlData = $.parseXML(strLessonXML).documentElement;
			
				// clear the interval
				clearInterval(interval);
			}catch(e){
				return;
			}
			
			
			
			// grab the lesson attributes
			_lessonID = _xmlData.getAttribute("lessonID");
			_lessonTitle = _xmlData.getAttribute("lessonTitle");
			_lessonType = _xmlData.getAttribute("lessonType");
			_allowShowLabel = _xmlData.getAttribute("allowShowLabel");
			_allowDebug = _xmlData.getAttribute("allowDebug");
												
			// go ahead and set our lockStep mode here
			if(_xmlData.getAttribute("lessonIsLockstep") == "false"){
				_lessonIsLockStep = false;
			}else{
				if (_lessonType.toLowerCase() == "cai") {
					_lessonIsLockStep = true;
				}else {
					_lessonIsLockStep = false;
				}
			}
			
	
			scope.init();
			
			/*
			if(parent.window["lessonData"] == null) return;
			
			clearInterval(interval);
			console.log("looking");
			_xmlData = parent.window["lessonData"];
			
			// grab the lesson attributes
			_lessonID = _xmlData.getAttribute("lessonID");
			_lessonTitle = _xmlData.getAttribute("lessonTitle");
			_lessonType = _xmlData.getAttribute("lessonType");
			_allowShowLabel = _xmlData.getAttribute("allowShowLabel");
			_allowDebug = _xmlData.getAttribute("allowDebug");
												
			// go ahead and set our lockStep mode here
			if (_lessonType.toLowerCase() == "cai") {
				_lessonIsLockStep = true;
			}
			else {
				_lessonIsLockStep = false;
			}
	
			scope.init();
			*/
		}, 100)
	
	}
	
	GlobalLessonData.prototype.loadJulianDateFile = function() {
		
		this._jqXhr = $.ajax({
			type: "GET",
			url: "../../date.txt",
			dataType: "text",
			error: function(jqXhr, textStatus, errorThrown) {
				console.log("Unable to load date file.");
				this._jqXhr = null;
			}.bind(this),
			success: function(data) {
				// set the text to a local
				_julianDate = data;
			}.bind(this)
		});	

	}
	
	GlobalLessonData.prototype.hardToGetSlideLabel = function() {

		// this function is really only here to support the ability to get the Slide Name (Label) for Question Pool
		// slides that are being pulled in via a Random Question slide, because the info for the Question Slide is NOT
		// transferred to the Random Slide, the Question Slide simply becomes a CHILD of the Random Slide, so to make 
		// a long story short, we have to go 'find' the child slide to get the label we want...
	
		// code to find the Slide Label, the hard way when we cannot rely on _currentSlideLabel

		try {
			
			var sLabel = "{error}"
			var qSlide_mc = null;
			
			// get the SlideData object for the current slide
			var sd = CaptivateSlideData;
			
			
			// make sure the SlideData did not return null
			if (sd != null) {
				// grab the slideMovieClip reference from the SlideData
				
				/* This is not going to work the same way because it is looking fro a MoviClip
				
				var rqSlide_mc:MovieClip = sd.slideMovieClip;
				// make sure the movieClip is not null
				if (rqSlide_mc != null) {
					
					// iterate thru all the children of the movieClip, looking for an object
					// that is of type cpSlide, this will be the 'actual' question slide
					for (var i = 0; i < rqSlide_mc.numChildren; i++) {
						var oString = rqSlide_mc.getChildAt(i).toString();
						//console.log("[cnatra.GlobalLessonData.as] hardToGetSlideLabel; " + oString);
						if (oString.indexOf("cpSlide") != -1) {
							qSlide_mc = rqSlide_mc.getChildAt(i);
						}
					}
					// check if we actually found a cpSlide
					if (qSlide_mc != null) {
						// we got something, so assuming it is actually a cpSlide object, then
						// then that means it has a slideXML property, and the slide label is 
						// in the AccProps.name node
						sLabel = qSlide_mc.slideXML.AccProps.name;
						console.log("[cnatra.GlobalLessonData.as] hardToGetSlideLabel; " + sLabel);
					}
					else {
						console.log("[cnatra.GlobalLessonData.as] hardToGetSlideLabel; cpSlide NOT found");
					}
				}
				
				*/
			}
		}
		catch(e) {
			console.log("[cnatra.GlobalLessonData.as] hardToGetSlideLabel; error: " + e.message);
		}		

		return sLabel;
	
	}
	
	GlobalLessonData.prototype.wasQuestionAnswered = function() {

	// initially the idea was to disable the FoRward arrow on any actual Question slide, since the action of
	// answering the Question would navigate the user off the Question slide, regardless of correct/incorrect
	// however, since it appears that Captivate does 'really' provide a way to allow a question to be revisited
	// over and over and re-answered as many times as the user wants, we need a way to find out if the Question
	// has indeed already been answered so we can turn on the Forward arrow and allow navigation off the slide
	// 
	// using my debug window, i saw there is a questionScore object that exists within a question slide
	// and inside that object there is a wasJudged boolean property that appears to be exactly what we are looking
	// for, a way to tell if the Question slide has been answered already
	// 
	// object path: stage.CaptivateMainTimeline.cpSlideContainer.cpSlide_#####._question.questionScore
	//
	// DD:  Those objects don't exist in the html version.  For the html version, we set a flag in the XML when
	// a question has been answered.  Then we look for that flag here
	

		// lots of error checking in this function just to be safe, and provide debugging feedback
		try {
			
			// going to default to True, so if any kind of failure, we are not preventing Forward navigation
			var wasAnswered = true;
			var qSlide_mc = null;
		
			// get the SlideData object for the current slide
			var varsHandle = this.CaptivateVarsHandle;
		
			
			
			// make sure the SlideData did not return null
			if (varsHandle != null) {

				// verify this is indeed a Question Slide
				if (varsHandle.cpInfoCurrentSlideType == "Question Slide") {
		
					var questionNode = $(this.XmlData).find("page[slideID=" + varsHandle.cpInfoCurrentSlideLabel + "]");
					if(questionNode.length > 0){
						questionNode = questionNode[0];					
						wasAnswered = ((questionNode.getAttribute("wasAnswered") != null) && (questionNode.getAttribute("wasAnswered").toLowerCase() == "true"));					
					}
					console.log("[cnatra.GlobalLessonData.as] wasQuestionAnswered; wasAnswered = " + wasAnswered);
	
				}else {
					console.log("[cnatra.GlobalLessonData.as] wasQuestionAnswered; slideType is NOT 'Question Slide', slideType = " + varsHandle.cpInfoCurrentSlideType);
				}
			}
			else {
				console.log("[cnatra.GlobalLessonData.as] wasQuestionAnswered; CaptivateSlideData is null!");
			}
		} catch(e) {
			console.log("[cnatra.GlobalLessonData.as] wasQuestionAnswered; error: " + e.message);
		}		

		return wasAnswered;			
		
	}
	
	
	
//-------------------------------------------------------------------------------------------------------------
//
// public XML support functions
// 
//------------------------------------------------------------------------------------------------------------	

		
	GlobalLessonData.prototype.getPrevSiblingSlideNum = function(oNode) {
		
		// given an XML node (expected to be a <page> node) see if it has a
		// previous sibling, and if so then return its slideNum attribute value
	
		var oSiblingNode = this.getPrevSibling(oNode);
		
		// now check that we actually got back a node	
		if (oSiblingNode != null) {
			return Number(oSiblingNode.getAttribute("slideNum"));
		} else {
			return -1;
		}
		
	}
	
	GlobalLessonData.prototype.getNextSiblingSlideNum = function(oNode) {

		// given an XML node (expected to be a <page> node) see if it has a
		// next sibling, and if so then return its slideNum attribute value
		
		var oSiblingNode = this.getNextSibling(oNode);
	
		// now check that we actually got back a node	
		if (oSiblingNode != null) {
			return Number(oSiblingNode.getAttribute("slideNum"));
		} else {
			return -1;
		}		
	}	
	
	GlobalLessonData.prototype.getPrevSibling = function(oNode) {

		// now check our index to make sure we are not the first child
		// (meaning we obviously don't have a previous sibling)
		if (oNode.previousElementSibling != null && oNode.previousElementSibling.nodeType != -1 ) {
			return oNode.previousElementSibling;
		} else {
			return null;
		}
	}
	
	GlobalLessonData.prototype.getNextSibling = function(oNode) {
	
		// first lets get our parent node
		var oParentNode = oNode.parentNode;

		// now check our index to make sure we are not the last child (meaning we obviously dont have a next sibling)
		// i am also adding a check here to make sure the node we are checking is indeed a <page> node, this will let
		// us ignore special container nodes like <branch> or any others we may come up with in the future
		if ((oNode.nextElementSibling != null) && (oNode.nodeName == "page")) {
			return oNode.nextElementSibling;
		}else{
		
			// if we make it here, then it should be true that we are the lastChild of this parent
			// so we need to climb our ancestor tree until we find an ancestor that has a next sibling,
			// or if we reach a topic node then we will simply return null, which will be handled 
			// elsewhere for triggering us to return to the Main Menu
			if (oParentNode.nodeName == "topic") {
				return null;
			} else {
				// recursive call
				return this.getNextSibling(oParentNode);
			}					
		}				
	}	

	GlobalLessonData.prototype.checkParentComplete = function(oNode) {

		// will assume completion is true until we find a false		
		// and for now we only support looking at the parent nodes direct children
		var children = oNode.children;			
		for (var i = 0; i < children.length; i++) {
			if (children[i].getAttribute("isComplete") != "yes") {
				return false;
			}
		}				
		return true;			
	}
	
	//
	// helper functions
	//

	function checkAnyTopicsComplete(nodeList) {
	
		// lockStep mode can override this
		if (_lessonIsLockStep == false) return true;
	
		// iterate through each node in the xmlList
		for(var i=0; i<nodeList.length; i++) {
			var node = nodeList[i]
			// check the isComplete attribute
			
			if (node.getAttribute("isComplete") == "yes") {
				// since we found at least 1, go ahead and return						
				return true;
			}					
		}
		
		// if we have made it here, then none must be complete
		return false;			
	}
	
	function addSlideNumAttr(topicNode) {

		// this is the "starter" function (non-recursive) that is expecting a <topic> XML node to be passed in
		// so we can grab the 'slideNumStart' attribute to initialize our slide numbering counter, which we will
		// then add to each <page> node found via a new attribute called 'slideNum'
	
		// grab the 'slideNumStart' attr from the <topic> node
		var currentSlideNum = topicNode.getAttribute("slideNumStart");
		var topicChildren = topicNode.children;
		
		// iterate through all child nodes this <topic> node may have	
		for (var i = 0; i < topicChildren.length; i++) {
		
			// lets make sure that this child that we found is indeed a <page> node, we only want to add
			// the new attribute to <page> nodes, and we only want those <page> nodes to increment our counter
			if (topicChildren[i].nodeName == "page") {

				// add the new 'slideNum' attribute to the <page> node dynamically
				topicChildren[i].setAttribute("slideNum", currentSlideNum);
				
				// increment the slide index number
				currentSlideNum = Number(currentSlideNum) + 1;
			
			}
			
			// check if this child node has children as well, if so then pass the node and our counter
			// to our recursive function that will process all levels of children for this node
			if (topicChildren[i].children.length > 0) {
				currentSlideNum = addSlideNumAttrToChildren(topicChildren[i], currentSlideNum);
			}	
		}		
	}
	
	function addSlideNumAttrToChildren(pageNode, slideNumStart) {

		// this is a recursive function that will process all levels of children for any given <page> node
		// and add the 'slideNum' attribute to each <page> node found while incrementing our slide index counter
		
		// initialize our counter (ie what is our starting slide index)
		var currentSlideNum = slideNumStart;

		// iterate thru all child nodes this <page> node may have	
		var pageChildren = pageNode.children;
		for (var i = 0; i < pageChildren.length; i++) {
		
			// lets make sure that this child that we found is indeed a <page> node, we only want to add
			// the new attribute to <page> nodes, and we only want those <page> nodes to increment our counter
			if (pageChildren[i].nodeName == "page") {
				
				// add the new 'slideNum' attribute to the <page> node dynamically
				pageChildren[i].setAttribute("slideNum", currentSlideNum);
				
				// increment the slide index number
				currentSlideNum = currentSlideNum + 1;
				
			}

			// check if this child node has children as well, if so then we will recursively call ourselves
			// passing along the current node and counter
			if (pageChildren[i].children.length > 0) {
				currentSlideNum = addSlideNumAttrToChildren(pageChildren[i], currentSlideNum);
			}
			
		}
	
		// once we have finished with the for...loop, then return the index we left off on
		return currentSlideNum;
	
	}

}());