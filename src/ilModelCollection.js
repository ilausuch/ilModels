/*
    MIT LICENSE @2016 Ivan Lausuch <ilausuch@gmail.com>
    Developed at CEU University
*/

/* global ilModelConfiguration */

ilModelCollection=function(config){
	this.data=[];
	
	this.updateEmitter=new ilModelEventsEmitter();
	
	if (config===undefined)
		config={};
            
        //TODO : Define model of this collection
	if (config.updateFnc){
		this.auto=true;
		this.ready=false;
		
		if (config.preventReload===undefined)
			config.preventReload=ilModelConfiguration.cache.collections.preventReload;
	}else{
		this.auto=false;	
		this.ready=true;
		
		if (config.data!==undefined){
			this.add(config.data);
			this.sort();
		}
			
		if (config.promise!==undefined){
			var $this=this;
			config.promise.then(function(data){
				$this.add(data);
				$this.sort();
			});
		}
	}
	
	this.config=config;
	
	this.sort=function(){
		if (this.config.sortFnc!==undefined)
			this.data.sort(this.config.sortFnc);
	};
	
	this.$add=function(object){
		if (object===undefined)
			throw new ilModelException("ilModelCollection.add","Object to insert is undefined");
		
		try{
			var pk=object.getPk();
		}
		catch(err){
			throw new ilModelException("ilModelCollection","Object to insert is not a ilModel",{theObject:object, theCollection:this});		
		}
		
                //TODO : Check that model of this object is the same of the model
		
		var where=this.where(pk);

		if (where===undefined)	
	    	this.data.push(object);
	    else{
		  	this.data[where]=object;
	    }
	    
	    this.sendUpdateEvent();
	};
	
	this.add=function(v){
	    if (this.auto)
	    	throw new ilModelException("ilModelCollection","This is an automatic collection");
	    
	    if (Array.isArray(v) || v instanceof Array){
	    	v.forEach(function(item){
		    	this.$add(item);
	    	},this);
	    }else
	    	this.$add(v);
    };
	
	this.remove=function(object){
	    var where=this.where(object.getPk());

		if (where!==undefined){
			this.data.splice(where, 1);
			this.sendUpdateEvent();
		}
		else{
			//throw new ilModelException("ilModelCollection","Object cannot be removed, it doesn't exist",{theCollection:this,theObject:object});
		}
    };
    
    this.where=function(pk){
	    if (pk !== null && typeof pk !== 'object')
	    	throw new ilModelException("ilModelCollection","PK is not valid",pk);
	    
	    var result=undefined;
	    this.data.forEach(function(item,k){
		    if (item.checkPk(pk)){
			    result=k;
			    return true;
		    }
	    });
	    
	    return result;
    };
    
    this.get=function(pk){
	    if (pk !== null && typeof pk !== 'object')
	    	throw new ilModelException("ilModelCollection","PK is not valid",pk);
	    
	    var result=undefined;
	    this.data.forEach(function(item){
		    if (item.checkPk(pk)){
			    result=item;
			    return true;
		    }
	    });
	    
	    return result;
    };
    
    this.extract=function(filterFnc){
		var list=[];
	    
	    this.data.forEach(function(item){
		    if (filterFnc(item))
		    	list.push(item);
	    });
	    
	    return list;
    };
    
    this.extractCollection=function(filterFnc){
	    var srcCollection=this;
	    var newCollection=new ilModelCollection({
		    updateFnc:function(promise,params){
			    promise.ready(srcCollection.extract(filterFnc));
		    }
		});
		
		newCollection.update();
		
		this.updateEmitter.register(function(event){
                    newCollection.eventListener(event);
                });
		
		return newCollection;
    };
    
    this.$requireUpdate=function(){
	    return !this.updated || !this.config.preventReload;
    };
    
    this.eventListener=function(event){
	    switch(event.type){
		    case "update":
		    	this.update();
		    break;
	    }
	    
	    return true;
    };
    
    this.sendUpdateEvent=function(){
	    this.updateEmitter.send({type:"update"}); 
    };
    
    this.update=function(){
	    if (!this.auto)
	    	throw new ilModelException("ilModelCollection","This is not an automatic collection");

	    if (this.config.updateFnc===undefined)
	    	throw new ilModelException("ilModelCollection","updateFnc not defined",{theCollection:this});
	    	
	    var promise=new ilModelPromise({owner:this,context:this.context});
	    
	    var $this=this;
	    
	    var promise2=new ilModelPromise();
	    
	    promise2.then(function(data){
			$this.data=data; 
			$this.sendUpdateEvent();
			promise.ready(data);
	    },
	    function(err){
		    throw new ilModelException("ilModelCollection","Cannot update",{theColleciton:$this});
	    });

	   
	    this.config.updateFnc(promise2);
	        
		return promise;
    };
    
    this.load=function(params,options){
	    if (!this.auto)
	    	throw new ilModelException("ilModelCollection","This is not an automatic collection");
	    
	    if (options===undefined)
	    	options={};
	    	
	    var promise=new ilModelPromise({owner:this,context:this.context});
	    
		if (options.forceReload || this.$requireUpdate()){
			this.ready=false;
			var $this=this;
			var promise2=new ilModelPromise().then(
				function(data){
					
                                    if (Array.isArray(data) || data instanceof Array){
				    	data.forEach(function(item){
					    	$this.$add(item);
				    	},this);
				    }else
				    	$this.$add(data);
				    	
					$this.ready=true;
					promise.ready($this.data);
				},
				function (err){
					promise.error(err);	
				}
			);
			
			this.config.updateFnc(promise2,params);
			this.sendUpdateEvent();
		}
		else
			promise.ready(this.data);
	   
		return promise;
    };
    
    this.reload=function(params,options){
	    if (options===undefined)
	    	options={};
	    	
	    options.forceReload=true;
	    
	    return this.load(options);
    };
};

ilModelCollection.createAuto=function(updateFnc){
	return new ilModelCollection({
		updateFnc:updateFnc
	});
};
