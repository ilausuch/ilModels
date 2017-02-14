/*
    MIT LICENSE @2016 Ivan Lausuch <ilausuch@gmail.com>
    Developed at CEU University
*/

/* global ilModelConfiguration */

ilModelCache=function(config){
	this.$isCache=true;
	
	this.getCollection=function(collection,options){
		if (collection===undefined)
			collection="global";
			
	    if (this.collections[collection])
	    	return this.collections[collection];
	    	
	    if (options===undefined)
	    	options={};
	    	
	    if (options.throwError===undefined)
	    	options.throwError=true;
	    
	    if (options.throwError!==false)
	    	throw new ilModelException("ilModel.$cache","Collection "+collection+" doesn't exist");
    };
    
    this.registerCollection=function(name,newCollection){
	    this.collections[name]=newCollection;
	    return newCollection;
    };
	
	//--- Init
	
	this.init=function(parentClass){
		this.parentClass=parentClass;
	};
	
	if (config===undefined)
		throw new ilModelException("ilModelCache","Invalid config",config);
		
	this.config=config;
	
    if (config.autoInsert===undefined)
    	this.autoInsert=ilModelConfiguration.cache.autoInsert;
    else
    	this.autoInsert=config.autoInsert;
    	
	this.collections={
	    global :new ilModelCollection()
    };
    
    if (config.collections!==undefined)
	    for (var name in config.collections)
		    this.registerCollection(name,config.collections[name]);

};