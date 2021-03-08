"use strict";
(function() {
    //
    // CNATRAMenu
    //
    //
    "use strict";

	var _gld = null;
    var _lessonData = null;

    window["CNATRAMenu"] = function CNATRAMenu(container, globalLessonData, lessonData) {

        // set locals, listen for player events
        //
        this.container = container;
		
		if($("#CNATRAMenu").length == 0){
			$(this.container).append('<div id="CNATRAMenu"></div>');
		}	
        
	
		if(globalLessonData != null){
			_gld = globalLessonData;
		}else{
			console.log("ERROR: GlobalLessonData not found");
			return;
		}

		// clear out the container
		$("#CNATRAMenu").empty();
		
        // if the lesson XMl is passed into the constructor, create the menu
        if(lessonData != null){
            _lessonData = lessonData;
            this.createMenu();
        }

    };
    Object.defineProperty(CNATRAMenu.prototype, "lessonData", {
        enumerable: true,
        set: function (value) {
            _lessonData = value;
            this.createMenu();
        }
    });

    CNATRAMenu.prototype.createMenu = function() {

        if(_lessonData == null) return;

        var topics = $(_lessonData).find("topic");

        for (var i=0; i<topics.length; i++){

            // create a top-level menu element
            var topLevelEl = document.createElement( "div" );

            // add the element to the DOM in the CNATRAMenu element
            $("#CNATRAMenu").append(topLevelEl);

            // add attributes and children
            $(topLevelEl).prop("id", topics[i].getAttribute("topicID"))
                         .attr("class", "menu-item")
                         .attr("data-slideNumStart", topics[i].getAttribute("slideNumStart"))
                         .attr("data-navMenuTitle", topics[i].getAttribute("navMenuTitle"))
                         .attr("data-bottomTitle", topics[i].getAttribute("bottomTitle"))
                         .attr("data-refText", topics[i].getAttribute("refText"))
                         .attr("data-showNavChildren", topics[i].getAttribute("showNavChildren"))
						 .append('<button id="buttonHitArea"></button>')
                         .append('<button class="submenu-button submenu-button-icon-up" ></button>')
                         .append('<span>' + topics[i].getAttribute("mainMenuTitle") + '</span>')
                         .append('<div class="sub-menu"><ul></ul></div>');
						 
			$(topLevelEl).find("#buttonHitArea").click(this.onTopLevelItemClick.bind(this));
						
			if (_gld.LessonType.toLowerCase() == "mil"){
			// always not lock-stepped	
                if(topics[i].getAttribute("isComplete") == "yes"){
                    $(topLevelEl).attr("complete","complete");
                }
			} else if (_gld.LessonType.toLowerCase() == "cai") {				
			// if we are in CAI mode, then we need to check our lockStep status
                //Colors:
                //  Visited BG: #808080
                //  Unvisited BG: #C0C0C0
                //  Disabled Font Color: #898989

				if (_gld.LessonIsLockStep == true) {

					// first handle the sub menu button
					if(topics[i].getAttribute("isComplete") != "yes"){
                        $(topLevelEl).find(".submenu-button").attr("disabled", "disabled");
					}else{
                        $(topLevelEl).find(".submenu-button").removeAttr("disabled");
                        $(topLevelEl).attr("complete","complete");
					}
					
					if(i == 0){
						$(topLevelEl).find("#buttonHitArea").removeAttr("disabled");
					}else if(topics[i-1].getAttribute("isComplete") == "yes"){
						$(topLevelEl).find("#buttonHitArea").removeAttr("disabled");
					}else{
                        $(topLevelEl).find("#buttonHitArea").attr("disabled", "disabled");
                        $(topLevelEl).attr("disabled","disabled");

					}
					
				}else{
					$(topLevelEl).find(".submenu-button").removeAttr("disabled");
					$(topLevelEl).find("#buttonHitArea").removeAttr("disabled");
					
				}
				
			}		 

            // create the submenu items
            var subMenu = $(topLevelEl).find("ul");
            var nSubMenuItems = $(topics[i]).children().length;
            if(nSubMenuItems > 26){
                subMenu.css("max-height",((Math.ceil((nSubMenuItems) * 0.6)) + 1) + "em");
            }
            // loop through the topic children and add submenu items where appropriate
            $(topics[i]).children().each( function( k, child ) {
                if((child.getAttribute("showInNav") != null) && (child.getAttribute("showInNav").toLowerCase() == "yes")){					
                    subMenu.append('<li data-slideNumber="' + child.getAttribute("slideNum") + '"><a href="#' + child.getAttribute("slideID") + '">' + child.getAttribute("navMenuTitle") + '</a>');
                }
            });

        }

		// set the event handler for the sub-menu items
		$("#CNATRAMenu").find("a").click(this.onSubLevelItemClick);
		
        // click event handler for the submenu toggle button
        //
        $(".submenu-button").click(function(){
            if($(this).hasClass("submenu-button-icon-up")){
                if($(this).parent().find("li").length > 0){
                    $(".submenu-button").removeClass("submenu-button-icon-down");
                    $(".submenu-button").addClass("submenu-button-icon-up");
                    $(this).removeClass("submenu-button-icon-up");
                    $(this).addClass("submenu-button-icon-down");
                    $(".sub-menu").css("display", "none");
                    $(this).parent().find(".sub-menu").css("display", "flex");
                }
            }else{
                $(this).removeClass("submenu-button-icon-down");
                $(this).addClass("submenu-button-icon-up");
                $(this).parent().find(".sub-menu").css("display", "none");
            }
        }).each(function(index, elem){
            if($(elem).parent().find("li").length == 0){
                $(elem).css('color', 'gray');
                $(elem).attr("Disabled","disabled");
            }
        });

    };
	
	CNATRAMenu.prototype.onTopLevelItemClick = function(e){
		
		var capVarsHandle = _gld.CaptivateVarsHandle;
		
		if($(e.target).parent() == null) return;
		
		var slideNum = $(e.target).parent().data("slidenumstart");
		
		if(slideNum == null) return;
		
		// tell the Captivate movie to jump to the appropriate slide
		if (capVarsHandle != null) {
			sessionStorage.setItem("lastNavigatedSlideNum", slideNum);
			capVarsHandle.cpCmndGotoSlide = slideNum;
			capVarsHandle.cpCmndResume = 1;
		}
	}
	
	CNATRAMenu.prototype.onSubLevelItemClick = function(e){
		
		var capVarsHandle = _gld.CaptivateVarsHandle;
		
		if($(e.target).parent() == null) return;
		
		var slideNum = $(e.target).parent().data("slidenumber");
		
		if(slideNum == null) return;
		
		// tell the Captivate movie to jump to the appropriate slide
		if (capVarsHandle != null) {
			
			// save the location
			if(sessionStorage.getItem("lastNavigatedSlideNum") != ""){
				sessionStorage.setItem("resumeSlideNum", sessionStorage.getItem("lastNavigatedSlideNum"));
			}
			
			// go to the slide
			capVarsHandle.cpCmndGotoSlide = slideNum;
			capVarsHandle.cpCmndResume = 1;
		}
	}



}());


