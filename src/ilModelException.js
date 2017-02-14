/*
    MIT LICENSE @2016 Ivan Lausuch <ilausuch@gmail.com>
    Developed at CEU University
*/


ilModelException=function(objectName,msg,details){
	this.objectName=objectName;
	this.msg=msg;
	this.details=details;
	
	
	window["lastException"]=this;
		
		
	this.toString=function(){
		return this.objectName+" "+this.msg+" - more details in lastException global variable";
	};
};


