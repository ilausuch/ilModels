/*
    MIT LICENSE @2016 Ivan Lausuch <ilausuch@gmail.com>
    Developed at CEU University
*/

/* global ilModelConfiguration, ilModelPromiseSync */

ilModelPromise=function(options){
	this.data=undefined;
	this.isLoading=true;
	this.isError=false;
	this.hasFinished=false;
	
	this.successEmitter=new ilModelEventsEmitter();
	this.errorEmitter=new ilModelEventsEmitter();
	
	if (options===undefined)
		options={};
		
	if (options.context===undefined)
		this.context=ilModelConfiguration.defaultContext;
	else
		this.context=options.context;
		
	if (options.owner!==undefined)
		this.owner=options.owner;
	
	this.ready=function(data){
		this.data=data;
		this.isLoading=false;
		this.hasFinished=true;
		
		var $this=this;
		this.context.delayFnc(function(){
			if ($this.successEmitter.length()>0)
				$this.successEmitter.send($this.data);
		});
		
	};
		
	this.error=function(err){
		var $this=this;
		this.hasFinished=true;
		this.isLoading=false;
		this.isError=false;
		this.error=err;
				
		this.context.delayFnc(function(){
			if ($this.errorEmitter.length()>0)
				$this.errorEmitter.send($this.error);
			else
				throw new ilModelException("ilModelPromise","Error loading data",{theOwner:$this.owner,error:err});
		});
	};
	
	this.then=function(callback,errorCallback){
		if (!this.hasFinished){
			if (callback instanceof ilModelPromise || callback instanceof ilModelPromiseSync){
				this.successEmitter.register(function(data){callback.ready(data);});
				this.errorEmitter.register(function(err){callback.error(err);});
			}
			else{
				this.successEmitter.register(callback);
                                if (errorCallback!=undefined && errorCallback!=null)
                                    this.errorEmitter.register(errorCallback);
			}
		}
		else{
			var $this=this;
			this.context.delayFnc(function(){
				if (!$this.isError){
					if (callback instanceof ilModelPromise || callback instanceof ilModelPromiseSync){
						callback.ready($this.data);
					}
					else{
						callback($this.data);
					}
				}
				else{
					if (callback instanceof ilModelPromise || callback instanceof ilModelPromiseSync){
						errorCallback.error($this.error);
					}
					else{
						errorCallback(error);
					}
				}
			});
			
		}
		
		
		return this;
	};

	
	if (options.data!==undefined){
		this.ready(options.data);
	}
};