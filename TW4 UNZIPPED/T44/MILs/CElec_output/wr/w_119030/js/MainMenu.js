"use strict";
var MainMenuWDGT = { 
    onLoad: function(){ 

		//
		// locals 
		//
		var _gld; // golbalLessonData reference
		
		// xmlParams are passed in via setData function below
		// (this functionality is currently not used by our mainmenu widget)
		var xmlParams;

		// this variable will hold our reference to the Lesson Data XML
		var _xmlData = null;
	
		// this variable will hold the lockStep flag, passed in from the global lesson data object
		var _lockStep;
		
		// local variables
		var _lessonType;
		//var _numButtons;
		//var _startPosY;
		//var _yCounter;
		//var _verticalSpacing;
		//var _xPos;
		
	
        if ( ! this.captivate ){ 
            return; 
        } 
	if(sessionStorage.getItem("resumeSlideNum") == null)
		sessionStorage.setItem("resumeSlideNum", "");

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
		
		// called by the playbar to refresh the lesson data
		this.refresh = function(){
			this.globalLessonData.loadLessonData(this);
		}
		
		// this function runs once the lesson XML data has been loaded
		// it sets a reference to this object outside of the iframe
		// so the playbar can reach it
		// once the data is loaded and the reference is set,
		// the menu is created from the lesson XML data
		this.init = function(){
		
			window.parent["mainMenu"] = this;

			// this is the Lesson Data XML that should have already been loaded by the Global Lesson Data object
			_xmlData = this.globalLessonData.XmlData;
			_lockStep = this.globalLessonData.LessonIsLockStep;
						
			// init local vars
			_lessonType = "{unknown}";

			// start the dynamic button building process			
			this.menu = new CNATRAMenu($("#menu"), this.globalLessonData, _xmlData);
			
		}
				
		this.globalLessonData.loadLessonData(this);
		this.globalLessonData.loadJulianDateFile();
		this.globalLessonData.CaptivateVarsHandle = this.varHandle;
		
		_gld = this.globalLessonData;
		
    },
    onUnload: function(){ 
        /*Unload your widget here*/
    }
} 

var MainMenu = function (){ 
    return MainMenuWDGT; 
}