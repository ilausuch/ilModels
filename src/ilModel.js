/*
    MIT LICENSE @2016 Ivan Lausuch <ilausuch@gmail.com>
    Developed at CEU University
*/

/* global ilModelConfiguration, this, ilModelAssociation, ilModelFieldQuery */

ilModel = function(config){
	
	this.$sendException=function(dueto){
		throw new ilModelException("ilModel",dueto,this);
	};
	
	this.getField=function(fieldName){
		return this.$class.getField(fieldName);
	};
	
    this.updateFrom = function (from) {
	    this.isDestroyed("updateFrom");
	    
        if (this.$fields === undefined) {
            this.$fields = [];

            for (var i in from)
                this.$fields.push(new ilModelField(i));
        }
        
        if (this.$data === undefined)
        	this.$data={};

        this.$fields.forEach(function (field) {
            this.$data[field.name] = from[field.name];
        }, this);
        
        this.$toVirtualObjectsAllFields(this);
    };

    this.copyTo = function (object,to) {
	    this.isDestroyed("copyTo");
	    
	    if (object===undefined)
	    	object=this;
	    	
        this.$fields.forEach(function (field) {
            to[field.name] = object[field.name];
        }, this);
    };

    this.getRaw = function (object) {
	    if (object===undefined)
	    	object=this;
	    
	    var to={};
	    this.copyTo(object,to);
	    return to;
    };

    this.equalTo = function (to) {
        for (var k = 0; k < this.$fields.length; k++) {
            var field = this.$fields[k];
            if (to[field.name] !== this[field.name])
                return false;
        };

        return true;
    };
    
    this.compareTo = function (to) {
        var $this=this;
        var list=[];
        
        this.$fields.forEach(function(field){
	        if ($this[field.name]!==to[field.name])
	    		list.push(field.name);    	
	    });
	        
        return list;
    };

    this.clone = function () {
	    this.isDestroyed("clone");
	    
        return new this.classFnc(this);
    };

    //----------------------------------------------------------------------------
    // PK Options
    //----------------------------------------------------------------------------
    
    this.getPk = function () {
        var result = {};
        var $this = this;

        this.$fields.forEach(function (field) {
            if (field.pk)
            	//result.push(new ilObjectId(field.name,$this[field.name]));
                result[field.name]=$this[field.name];
        });

        return result;
    };
    
    this.checkPk = function(pk){
	    if (pk !== null && typeof pk !== 'object')
			throw new ilModelException("ilModel","PK is not valid",pk);
			    
		var coincidence=true;
		var $this=this;
		
	    this.$fields.some(function (field) {
			if (field.pk){
				if (pk[field.name]===undefined)
					throw new ilModelException("ilModel.checkPk","PK is not valid, requires "+field.name+" field",{thePk:pk,theItem:$this});
				
				if(pk[field.name]!==$this[field.name]){
					coincidence=false;
					return false;
				}
			}
		});
		
		return coincidence;
    };
	
    this.getPkHash = function(){
            return JSON.stringify(this.getPk());
    };
	
 
	//----------------------------------------------------------------------------
    // Validations
    //----------------------------------------------------------------------------
  
    this.validateFieldInternal=function(object,fieldName,throwExceptions){
	    var field=this.getField(fieldName);
        if (field===undefined)
        	return true;
        	
		
        if (throwExceptions===undefined)
	    	throwExceptions=true;
	    
        try{
		    return field.validate(object[field.name]);
	    }catch(e){
		    if (throwExceptions)
		    	throw e;
		    else
		    	return false;
	    }
    };

    this.validateField = function (fieldName,throwExceptions) {
        return this.validateFieldInternal(this,fieldName,throwExceptions);
    };
    
    this.validateSandboxField = function (fieldName,throwExceptions) {
        return this.validateFieldInternal(this.$sandbox,fieldName,throwExceptions);
    };
    
    this.validateInternal=function(object,throwExceptions){
	    var errors=[];
	    
	    if (throwExceptions===undefined)
	    	throwExceptions=true;
	    	
	    $this=this;
	    this.$fields.some(function(field){
		    if (($this.$isNew && field.auto && object[field.name]===undefined) || field.noValidate){
			    //Authomatic field calculated by the dataProvider, it's not verificable
		    }
		    else{
				try{
			    	$this.validateFieldInternal(object,field.name);
			    }catch(e){
				    errors.push(e);
			    }    
		    }
		    
	    });
	    
	    if (errors.length>0)
		    if (throwExceptions)
		    	throw new ilModelException("ilModel","Validation error",{object:object,errors:errors});
		    else
		    	return false;
	    
	    return true;
	    	
    };
    
    this.validate=function(throwExceptions){
        return this.validateInternal(this,throwExceptions);
    };
    
    this.validateSandbox=function(throwExceptions){
	    return this.validateInternal(this.$sandbox,throwExceptions);
    };
    
    //----------------------------------------------------------------------------
    // Virtual
    //----------------------------------------------------------------------------
    
    this.$toVirtualObjectsField=function(object,field){
	    if (field.virtual!==undefined)
	    	if (object.$data[field.name]!==undefined)
		    	object.$virtualData[field.virtual.name]=field.virtual.toVirtual(object.$data[field.name],object);
		    else
		    	object.$virtualData[field.virtual.name]=undefined;
    };
    
    this.$toVirtualObjectsAllFields=function(object){
	    this.$fields.forEach(function(field){
		    this.$toVirtualObjectsField(object,field);    	
	    },this);
    };
    
    this.$fromVirtualObjectsField=function(object,field){
	    if (field.virtual!==undefined){
	    	if (object.$virtualData[field.virtual.name]!==undefined)
		    	object.$data[field.name]=field.virtual.fromVirtual(object.$virtualData[field.virtual.name],object);
		    else
		    	object.$data[field.name]=undefined;
		
			var associations=this.$class.getAssociationsOfField(field);
			if (associations.length>0){
				associations.forEach(function(association){
					this.$updateAssociation(association);
				},this);
			}
		}
    };
    
    this.$fromVirtualObjectsAllFields=function(object){
	    this.$fields.forEach(function(field){
			this.$fromVirtualObjectsField(object,field);	
	    },this);
    };


	//----------------------------------------------------------------------------
    // Sandbox
    //----------------------------------------------------------------------------
    this.prepareSandbox = function () {
	    this.isDestroyed("sandbox");
	    
        this.$sandbox = {
	        $data:{},
	        $virtualData:{},
	        $owner:this
		};
        
        var $owner=this;
        
        //Copy & set/get
        this.$fields.forEach(function(field){
			this.$sandbox.$data[field.name]=this.$data[field.name];
			
			if (this.$sandbox.$data[field.name]===undefined)
				this.$sandbox.$data[field.name]=field.byDefaultValue;
			
			Object.defineProperty(this.$sandbox,field.name,{
				get:function(){
					return this.$data[field.name];
				},
				set:function(value){
					if (field.readOnly)
						throw new ilModelException(this.$className,"Cannot modify a readOnly property on sandbox",{theField:field,theObject:this});
						
					this.$data[field.name]=value;
					
					if (field.virtual)
						$owner.$toVirtualObjectsField(this,field);
				}
			});
			
			if (field.virtual!==undefined){
				Object.defineProperty(this.$sandbox,field.virtual.name,{
					get:function(){
						return this.$virtualData[field.virtual.name];
					},
					set:function(value){
						this.$virtualData[field.virtual.name]=value;

						$owner.$fromVirtualObjectsField(this,field);
					}
				});
			}
		},this);
		
		//Prepare virtual fields
		this.$toVirtualObjectsAllFields(this.$sandbox);
        
        if (this.onSandbox !== undefined) this.onSandbox();
        return this.$sandbox;
    };
    
    this.sandboxChanges=function(){
	    this.isDestroyed("sandboxChanges");
	    
	    if (this.$sandbox === undefined)
	    	this.$sendException("Sandbox not created, use prepareSandbox before");
		
		this.$fromVirtualObjectsAllFields(this.$sandbox);
	    this.validateSandbox();
	    
	    var info={
		    raw:{},
		    changes:{},
		    countChanges:0
	    };
	    
	    this.$fields.forEach(function(field){
		    info.raw[field.name]=$this.$sandbox[field.name];
		    if ($this[field.name]!==$this.$sandbox[field.name]){
		    	info.changes[field.name]=$this.$sandbox[field.name];
				info.countChanges++;
		    }
	    });
	    
	    return info;
    };

    this.isSandboxChanged = function () {
	    this.isDestroyed("isSandboxChanged");
	    
	    return this.sandboxChanges().countChanges>0;
    };
    
    this.$confirmedSaveData=function(data,promise){
	    
	    //TODO Check if pk has changed in replace or update
	    
	    //Validate pk
	    if (this.$isNew){
		    var pkValidated=true;
		    
		    this.$fields.some(function(field){
			    if (field.pk && (data[field.name]===undefined || data[field.name]==="")){
				    pkValidated=false;
				    return false;
			    }
		    });
		    
		    if (!pkValidated)
		    	throw new ilModelException(this.$className,"Invalid pk in incoming data",{theObject:this,theIncommingData:data});
	    }
	    
	    //It's not a new object
	    var wasNew=this.$isNew;
	    this.$isNew=false;
	   
	    //Update sandbox with new data
		if (data!==undefined)
		    for (var key in data){
			    if (this.getField(key)!==undefined){
				    this.$sandbox.$data[key]=data[key];
			    }
		    }
		
	    //Confirm sandbox
	    this.$confirmSandboxBasic();
	    
	    //Delete sandbox
	    this.$sandbox=undefined;
	    
	    //Add to collection if it's necesary
	    if (wasNew){
		    if (this.$class.$cache && this.$class.$cache.autoInsert){
				this.$cache.getCollection().add(this);
			}
	    }
	    
	    
	    if (this.postSave)
	    	this.postSave();
	    	
	    promise.ready(this);
    };
    
    this.$confirmSandboxBasic=function(){
    	this.$isNew=false;
		this.updateFrom(this.$sandbox);
		this.validate();
		this.$toVirtualObjectsAllFields(this);
		
    };

    this.confirmSandbox = function (saveCallback) {
	    this.isDestroyed("confirmSandbox");
	    
	    var $this=this;
	    var promise=new ilModelPromise();
	    
	    var info=this.sandboxChanges();
	    
	    if (info.countChanges===0){
		    promise.ready(this);
		    return promise;
	    }
	    
	    if (saveCallback){
		    saveCallback(info).then(function(data){
			    $this.$confirmedSaveData(data,promise);
		    },
		    function(err){
			    promise.error(err);
		    });
		}
		else{
			this.$confirmSandboxBasic();
			promise.ready(this);
		}
	    
	    return promise;
    };
    
    this.save=function(options){
	    this.isDestroyed("save");
	    var $this=this;
	    
	    return this.confirmSandbox(function(info){
			var promise=new ilModelPromise();
			
			var options=$this.$class.$prepareQueryOptions(options);
			
			if ($this.$isNew){
				options.dataProvider.create(info.changes).then(function(data){
					promise.ready(data);		
				},
				function(err){
					promise.error(err);
				});
			}
			else{
				var useReplaceInsteadModify=$this.$class.$options.useReplaceInsteadModify;
				var op="";
				var data=info.changes;
			
				if (options.useReplaceInsteadModify!==undefined)
					useReplaceInsteadModify=options.useReplaceInsteadModify;
					
				if (useReplaceInsteadModify){
					op="replace";
					data=info.raw;
				}else
					op="modify";
				
				if (options.dataProvider[op]===undefined)
					throw new ilModelException(this.$className,"Operation "+op+" isn't defined on data provider",{theObject:this,theDataProvider:options.dataProvider});
						
				options.dataProvider[op]($this.getPk(),data).then(function(data){
					promise.ready(data);
				},
				function(err){
					promise.error(err);
				});
			}
			
			return promise;
		});
    };
    
    this.remove=function(options){
	    this.isDestroyed("remove");
	    
	    var promise=new ilModelPromise();
		var options=this.$class.$prepareQueryOptions(options);
		var $this=this;
		
	    if (this.$isNew){
			promise.ready();    
		}
		else{
			options.dataProvider.remove(this.getPk()).then(function(data){
				$this.destroy();
				promise.ready($this);
			},
			function(err){
				promise.error(err);
			});
		}
		
		return promise;
    };
    
    this.isDestroyed=function(functionName){
	    if (this.$destroyed)
	    	throw new ilModelException(this.$className,"This function cannot be used because object is destroyed",
                    {theObject:this,theFunction:functionName});
    };
    
    this.destroy=function(){
	    //Destroy object
	    this.$sandbox=undefined;
	    this.$destroyed=true;
	    
	    
	    //Remove from cache
	    for (var k in this.$class.$cache.collections){
		    var collection=this.$class.$cache.collections[k];
		    collection.remove(this);
	    }
    };
    
    //----------------------------------------------------------------------------
    // Associations
    //----------------------------------------------------------------------------
    
    this.searchAssociation=function(assocName){
	    for (var assocName2 in this.$class.$associations){
		    if (assocName2===assocName)
				return this.$class.$associations[assocName];
		}
		
		throw new ilModelException(this.$className,"Invalid association",{theAssocName:assocName});
    };
    
    this.getAssociation=function(assocName){
	    var assoc=this.searchAssociation(assocName);
	    		
		if (this.$associations[assocName]!==undefined)
			return this.$associations[assocName];
		
		this.$associations[assocName]=assoc.get(this);
		
		return this.$associations[assocName];
    };
    
    this.invalideAssociation=function(assocName){
	    this.searchAssociation(assocName);
	    	
	    this.$associations[assocName]=undefined;
	    this.$associationsCacheData[assocName]=undefined;
	    return this.getAssociation(assocName);
    };
    
    this.updateAssociationsBySrc=function(src){
	    for (var assocName in this.$class.$associations){
		    var assoc=this.$class.$associations[assocName]; //TODO: raw associations, without options
			if (src[assoc.associated]!==undefined)
				assoc.forceRawData(this,src[assoc.associated]);
		}
    };
    
    //----------------------------------------------------------------------------
    // Class constructor
    //----------------------------------------------------------------------------
    
    this.$setupClass=function(config){
	    
	    function byDefault(object,field,value){
			if (object[field]===undefined)
				object[field]=value;
		}
		
		var $this=this;
		
		var fields=config.fields;
		var options=config.options;
		var className=config.name;
		var cache=config.cache;
		var dataProviders=config.dataProviders;
		
		if (fields===undefined || !Array.isArray(fields))
			throw new ilModelException(className,"fields must be an array specified on config",{theConfig:config});
		
		this.$className=className;
		this.$class=window[className];
		this.$class.$class=this.$class;
		this.$class.$className=className;
			
		if (options===undefined)
			this.$options={};
		else
			this.$options=options;
		
		this.$class.$options=this.$options;
		this.$fields=fields;
		this.$class.$fields=fields;
		this.$class.$context=config.context;
		this.$class.postConstructor=config.postConstructor;
		this.$class.$methods=config.methods;
		
		//Define internal Uid System
		this.$class.$nextUid=0;
		this.$class.getNextUid=function(){
			var next=this.$nextUid;
			this.$nextUid++;
			return next;
		};
		
		//Define defaults options
		byDefault(this.$options,"validateOnCreate", ilModelConfiguration.basics.validateOnCreate);
		byDefault(this.$options,"validateOnCreateNew", ilModelConfiguration.basics.validateOnCreateNew);
		byDefault(this.$options,"validateGenerateException", ilModelConfiguration.basics.validateGenerateException);
		byDefault(this.$options,"defaultDataProvider", undefined);
		byDefault(this.$options,"forceReload", ilModelConfiguration.dataProviders.forceReload);
		byDefault(this.$options,"useReplaceInsteadModify", ilModelConfiguration.dataProviders.useReplaceInsteadModify);
		
		//Check fields
		this.$fields.forEach(function (item) {
                    if (!(typeof item === 'ilModelField' || item instanceof ilModelField))
                            throw new ilModelException($this.className,"Error checking field. It's not a ilModelField",item);
                });

                //Cache system
                if (config.cache){
                        if (!config.cache.$isCache)
                                throw new ilModelException(this.className,"Cache object is not a cache",{theCache:config.cache});

                        this.$class.$cache=config.cache;
                }
                else if (ilModelConfiguration.cache.createCacheByDefault){
                        this.$class.$cache=new ilModelCache({});
                }

                if (this.$class.$cache!==undefined){
                        this.$cache=this.$class.$cache;
                        this.$cache.init(this.$class);
                }

                this.$class.getCollection=function(name){
                    return this.$class.$cache.getCollection(name);
            };
		
		//DataProviders
        this.$class.$dataProviders={};
		
		if (config.dataProviders){
	        this.$dataProviders=this.$class.$dataProviders;
	        
	        var isTheFirstDataProvider=true;
	        
	        for (var name in config.dataProviders){    
		        this.$class.$dataProviders[name]=config.dataProviders[name];
		        
		        if (this.$class.$dataProviders[name].init!==undefined){
			        try{
			        	this.$class.$dataProviders[name].init(this.$class,name);
			        }
			        catch(e){
				        throw new ilModelException("ilModel","Data provider "+name+" has an incorrect init function",
                                        {theDataProvider:this.$class.$dataProviders[name]});
			        }
			    }
		        
		        if (isTheFirstDataProvider){
			        if (this.$options.defaultDataProvider===undefined)
			        	this.$options.defaultDataProvider=name;
			        
			        isTheFirstDataProvider=false;
		        }
		        
	        }
		}
		
		this.$class.getDataProvider=function(name){
		    if (this.$class.$dataProviders[name]!==undefined)
		    	return this.$class.$dataProviders[name];
		    else
		    	throw new ilModelException(this.$class.$className,"Dataprovider "+name+" doesn't exist");
                };
		
		
		//Associations
		if (config.associations){
			this.$class.$associations=config.associations;
			
			for (var k in this.$class.$associations){
				if (!(this.$class.$associations[k] instanceof ilModelAssociation))
					throw new ilModelException(this.$className,"Association is not an ilModelAssociation",
                                            {theAssociation:this.$class.$associations[k]});
					
				this.$class.$associations[k].setup(k,this.$class);
			}
		}
		
		this.$class.getField=function(fieldName){
			for (var x=0; x<this.$fields.length; x++){
				if (this.$fields[x].name===fieldName)
					return this.$fields[x];
			}
			
			return undefined;
		};
		
		//Synthetics
		if (config.synthetics){
			this.$class.$synthetics=config.synthetics;
		}
		
		this.$class.$prepareQueryOptions=function(options){
			if (options===undefined)
				options={};
				
			if (options.forceReload===undefined)
				options.forceReload=this.$options.forceReload;
			
			if (options.forceReload===undefined)
				options.forceReload=false;
	
			if (options.dataProvider===undefined)
				options.dataProvider=this.$class.$options.defaultDataProvider;
			
			options.dataProvider=this.$class.$dataProviders[options.dataProvider];
				
			if (options.dataProvider===undefined)
				throw new ilModelException($this.$className,"There are no a data provider",options);
			
				
			return options;
		};
		
		//Extract pk from src
		this.$class.extractPK=function(src){
                    var result = {};
	
                    $this.$class.$fields.forEach(function (field) {
                        if (field.pk)
                            result[field.name]=src[field.name];
                    });

                    return result;
		};
		
		
		//Create a new object from src data if it doesn't exist
		//If exists, update associations
		this.$class.createIfNotExist=function(src,forceUpdate){
			if (forceUpdate===undefined)
				forceUpdate=true;
				
			var pk=$this.$class.extractPK(src);
			
			var obj=$this.$class.getCollection().get(pk);
			
			if(obj){
				if (forceUpdate){
					//DONE Update current object with src	
					obj.updateFrom(src);
				}
				
				obj.updateAssociationsBySrc(src);
			}else
				obj=new $this.$class(src);	
			
				
			return obj;
		};
		
		//Global getter
		this.$class.get=function(pk,options){
			var promise=new ilModelPromise({owner:this.$class,context:this.$class.$context});
			
			options=this.$prepareQueryOptions(options);
			
			if (options.forceReload){
				options.dataProvider.get(pk,options).then(promise);
			}else{
				var result=this.getCollection().get(pk);
				
				if (result!==undefined)
					promise.ready(result);
				else
					options.dataProvider.get(pk,options).then(promise);
			}
			
			return promise;
				
		};
		
		//Global all
		this.$class.all=function(options){
			var promise=new ilModelPromise({owner:this.$class,context:this.$class.$context});
			
			options=this.$prepareQueryOptions(options);
			
			var collection=this.$class.$cache.getCollection("all",{throwError:false});
			
			if (collection===undefined || options.forceReload){
				this.$class.$cache.registerCollection("all",new ilModelCollection({
					promise:options.dataProvider.all(options).then(promise)
				}));	
			}
			else{
				promise.ready(collection.data);
			}
			
			return promise;
		};
		
		//Global query
		this.$class.query=function(query,options){
			var promise=new ilModelPromise({owner:this.$class,context:this.$class.$context});
			
			options=this.$prepareQueryOptions(options);
			
			var collectionId=ilModelFieldQuery.toString(query);
			var collection=this.$class.$cache.getCollection(collectionId,{throwError:false});
			
			if (collection===undefined || options.forceReload){
				this.$class.$cache.registerCollection(collectionId,new ilModelCollection({
					promise:options.dataProvider.query(query,options).then(promise)
				}));	
			}
			else{
				promise.ready(collection.data);
			}
			
			return promise;
		};
		
		this.$class.getAssociationsOfField=function(field){
			var associations=[];
			
			for (var k in this.$associations){
				var association=this.$associations[k];
				for (var j in association.by){
					if (field.name===j){
						associations.push(association);
						break;
					}
				}
			}
			
			return associations;
		};
		
		this.$class.toModelArray=function(array){
			var list=[];
			array.forEach(function(data){
				list.push(new window[className](data));
			
			});
			return list;
		};
		
		if (config.staticMethods!==undefined){
			for (var k in config.staticMethods){
				this.$class[k]=config.staticMethods[k];
			}
		}
	};
    
    //----------------------------------------------------------------------------
    // Object constructor
    //----------------------------------------------------------------------------
    
    this.$setupObject=function(src){
	    var $this=this;
		
		//Set internal Uid
		this.$internalUid=this.$class.getNextUid();//(""+Math.random()).substring(2);
		this.$className=this.$class.$className;
		
		this.$data={};
		this.$virtualData={};
		this.$associations={};
		this.$associationsCacheData={};
		
		/*
		this.$emitters={  //Not used yet 
			changes:new ilModelEventsEmitter()
		}
		*/
		
		this.$setAndGet={
			locked:false,
			lock:function(){
				this.locked=true;
			},
			unlock:function(){
				this.locked=false;
			}
		};
		
		//Create set&get of fields
		this.$fields.forEach(function(field){
			//Check property is not already defined
			if (field.name in this)
				throw new ilModelException(this.$className,"Duplicated property "+field.name,{theObject:this,theField:field});
			
			Object.defineProperty(this,field.name,{
				get:function(){return this.$data[field.name];},
				set:function(value){
					this.isDestroyed("set variable");
					
					if (this.$setAndGet.locked)
						throw new ilModelException(this.$className,"Cannot modify "+field.name+" use $sandbox",{theValue:value});
					else{
						if (field.readOnly)
							throw new ilModelException(this.$className,"Cannot modify a readOnly property",{theField:field,theObject:this});
					
						this.$data[field.name]=value;
						
						if (field.virtual!==undefined)
							this.$toVirtualObjectsField(this,field);
					}
					
					var associations=this.$class.getAssociationsOfField(field);
					if (associations.length>0){
						associations.forEach(function(association){
							this.$updateAssociation(association);
						},this);
					}
						
				}
			});
			
			if (field.virtual!==undefined){
				try{
					Object.defineProperty(this,field.virtual.name,{
						get:function(){
							return this.$virtualData[field.virtual.name];
						},
						set:function(value){
							if (field.readOnly)
								throw new ilModelException(this.$className,"Cannot modify a readOnly property",{theField:field,theObject:this});
						
							if (this.$setAndGet.locked)
								throw new ilModelException(this.$className,"Cannot modify "+field.name+" use $sandbox",{theValue:value});
							
							this.$virtualData[field.virtual.name]=value;
	
							this.$fromVirtualObjectsField(this,field);
						}
					});
				}catch(e){
					throw new ilModelException(this.$className,"Cannot define a virtual variable, already declared" ,{theField:field.name,theFieldVirtual:field.virtual.name});
				}
			}
		},this);
		
		
		//Create set&get of associations
		if (this.$class.$associations){
			var list=[];
			
			for (var assocName in this.$class.$associations)
				list.push({name:assocName,assoc:this.$class.$associations[assocName]});
				
			list.forEach(function(item){
				$this.$associationsCacheData[item.name]=undefined;
				
				try{
					Object.defineProperty(this,item.name,{
						get:function(){
							return this.getAssociation(item.name);
						},
						set:function(value){
							//if (this.$setAndGet.locked)
							throw new ilModelException($this.$className,"Cannot modify an association",{theAssociation:item});
						}
					});
				}catch(e){
					throw new ilModelException($this.$className,"Cannot define an association variable, already declared" ,{theAssociation:item});
				}
			},this);
		}
		
		//Create get of syntethics
		if (this.$class.$synthetics){
			var list=[];
			
			for (var syntheticName in this.$class.$synthetics){
				list.push({name:syntheticName,fnc:this.$class.$synthetics[syntheticName]});	
			}
			
			list.forEach(function(item){
				try{
					Object.defineProperty(this,item.name,{
						get:function(){
							return item.fnc(this);
						},
						set:function(value){
							throw new ilModelException($this.$className,"Cannot modify a synthetic field ",{theSynthetic:item});
						}
					});
				}catch(e){
					throw new ilModelException($this.$className,"Cannot define a syntetic variable, already declared" ,{theSyntetic:item});
				}
			},this);
		}
		
		//Create object methods
		if (this.$class.$methods){
			for(var k in this.$class.$methods)
				this[k]=this.$class.$methods[k];
		}
		
		//Post constructor		    
		if (this.$class.preConstructor!==undefined)
			this.$class.preConstructor(this);
		
		
		if (src === undefined) {
            this.$isNew = true;
            this.prepareSandbox();
            
            if (this.onCreate !== undefined)
                this.onCreate();
            
            this.$setAndGet.lock();
            
            if (this.$options.validateOnCreateNew)
	        	this.validate();    	
        }
        else{
	        this.$isNew=false;
	        this.updateFrom(src);
	        this.updateAssociationsBySrc(src);
	        
	        this.$setAndGet.lock();
	        
	        if (this.$options.validateOnCreate)
				this.validate();
        }
		
        if (this.onInit !== undefined)
            this.onInit(this.$isNew);

		if (!this.$isNew && this.$class.$cache && this.$class.$cache.autoInsert){
			this.$cache.getCollection().add(this);
		}
		
		
		
		if (this.$class.postConstructor!==undefined)
			this.$class.postConstructor(this);
    };
    
    //----------------------------------------------------------------------------
    // Init
    //----------------------------------------------------------------------------

    this.$setupClass(config);
};

//----------------------------------------------------------------------------------------------------
// Setup Class & Object constructor & Helpers
//----------------------------------------------------------------------------------------------------
ilModel.setup=function(config){
	
	if (config===undefined)
		throw new ilModelException("ilModel.setup","Confing is null");
		
	if (config.name===undefined)
		throw new ilModelException("ilModel.setup","name of class must be specified in config",{theConfig:config});
	
	if (config.context===undefined)
		config.context=ilModelConfiguration.defaultContext;
		
	if (config.defaults===undefined)
		config.defaults={};
	
	//Construcotr (with ilModel as name constructor function)
	window[config.name]=function ilModelObject(src){
		this.$setupObject(src);	
	};
	
	//Prototype
	window[config.name].prototype = new ilModel(config);
};