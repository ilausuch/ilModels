/*
    MIT LICENSE @2016 Ivan Lausuch <ilausuch@gmail.com>
    Developed at CEU University
*/

ilModelConfiguration={
	basics:{
		validateOnCreate:true,
		validateOnCreateNew:false,
		validateGenerateException:true
		
	},
	dataProviders:{
		forceReload:false,
		useReplaceInsteadModify:false
	},
	cache:{
		createCacheByDefault:true,
		autoInsert:true,
		collections:{
			preventReload:true
		}
	},
	defaultContext:{
		delayFnc:function(callback){setTimeout(callback);},
		http:undefined
	},
	
	setupDefaultAngularContext:function($http,$timeout){
		ilModelConfiguration.defaultContext.http=new ilModelHttpAngular();
		ilModelConfiguration.defaultContext.http.setup({$http:$http});
		
		ilModelConfiguration.defaultContext.delayFnc=function(callback){
			$timeout(callback);
		};
	}
};