/*
    MIT LICENSE @2016 Ivan Lausuch <ilausuch@gmail.com>
	Developed at CEU University
	Beta 2
*/
ilModel = function(config){
	
	this.$sendException=function(dueto){
		throw new ilModelException("ilModel",dueto,this);
	}
	
	this.getField=function(fieldName){
		return this.$class.getField(fieldName);
	}
	
    this.updateFrom = function (from) {
	    this.isDestroyed("updateFrom");
	    
        if (this.$fields == undefined) {
            this.$fields = [];

            for (var i in from)
                this.$fields.push(new ilModelField(i));
        }
        
        if (this.$data==undefined)
        	this.$data={};

        this.$fields.forEach(function (field) {
            this.$data[field.name] = from[field.name];
        }, this)
        
        this.$toVirtualObjectsAllFields(this);
    }

    this.copyTo = function (object,to) {
	    this.isDestroyed("copyTo");
	    
	    if (object==undefined)
	    	object=this;
	    	
        this.$fields.forEach(function (field) {
            to[field.name] = object[field.name];
        }, this);
    }

    this.getRaw = function (object) {
	    if (object==undefined)
	    	object=this;
	    
	    var to={};
	    this.copyTo(object,to);
	    return to;
    }

    this.equalTo = function (to) {
        for (var k = 0; k < this.$fields.length; k++) {
            var field = this.$fields[k];
            if (to[field.name] != this[field.name])
                return false;
        };

        return true;
    }
    
    this.compareTo = function (to) {
        var $this=this;
        var list=[];
        
        this.$fields.forEach(function(field){
	        if ($this[field.name]!=to[field.name])
	    		list.push(field.name);    	
	    });
	        
        return list;
    }

    this.clone = function () {
	    this.isDestroyed("clone");
	    
        return new this.classFnc(this);
    }

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
    }
    
    this.checkPk = function(pk){
	    if (pk !== null && typeof pk !== 'object')
			throw new ilModelException("ilModel","PK is not valid",pk);
			    
		var coincidence=true;
		var $this=this;
		
	    this.$fields.some(function (field) {
			if (field.pk){
				if (pk[field.name]==undefined)
					throw new ilModelException("ilModel.checkPk","PK is not valid, requires "+field.name+" field",{thePk:pk,theItem:$this});
				
				if(pk[field.name]!=$this[field.name]){
					coincidence=false;
					return false;
				}
			}
		});
		
		return coincidence;
    }
	
	this.getPkHash = function(){
		return JSON.stringify(this.getPk());
	}
	
 
	//----------------------------------------------------------------------------
    // Validations
    //----------------------------------------------------------------------------
  
    this.validateFieldInternal=function(object,fieldName,throwExceptions){
	    var field=this.getField(fieldName);
        if (field==undefined)
        	return true;
        	
		
        if (throwExceptions==undefined)
	    	throwExceptions=true;
	    
        try{
		    return field.validate(object[field.name]);
	    }catch(e){
		    if (throwExceptions)
		    	throw e;
		    else
		    	return false;
	    }
    }

    this.validateField = function (fieldName,throwExceptions) {
        return this.validateFieldInternal(this,fieldName,throwExceptions);
    }
    
    this.validateSandboxField = function (fieldName,throwExceptions) {
        return this.validateFieldInternal(this.$sandbox,fieldName,throwExceptions);
    }
    
    this.validateInternal=function(object,throwExceptions){
	    var errors=[];
	    
	    if (throwExceptions==undefined)
	    	throwExceptions=true;
	    	
	    $this=this;
	    this.$fields.some(function(field){
		    if (($this.$isNew && field.auto && object[field.name]==undefined) || field.noValidate){
			    //Authomatic field calculated by the dataProvider, it's not verificable
		    }
		    else{
				try{
			    	$this.validateFieldInternal(object,field.name)
			    }catch(e){
				    errors.push(e);
			    }    
		    }
		    
	    })
	    
	    if (errors.length>0)
		    if (throwExceptions)
		    	throw new ilModelException("ilModel","Validation error",{object:object,errors:errors});
		    else
		    	return false;
	    
	    return true;
	    	
    }
    
    this.validate=function(throwExceptions){
	    return this.validateInternal(this,throwExceptions);
	}
    
    this.validateSandbox=function(throwExceptions){
	    return this.validateInternal(this.$sandbox,throwExceptions);
    }
    
    //----------------------------------------------------------------------------
    // Virtual
    //----------------------------------------------------------------------------
    
    this.$toVirtualObjectsField=function(object,field){
	    if (field.virtual!=undefined)
	    	if (object.$data[field.name]!=undefined)
		    	object.$virtualData[field.virtual.name]=field.virtual.toVirtual(object.$data[field.name],object);
		    else
		    	object.$virtualData[field.virtual.name]=undefined;
    }
    
    this.$toVirtualObjectsAllFields=function(object){
	    this.$fields.forEach(function(field){
		    this.$toVirtualObjectsField(object,field);    	
	    },this)
    }
    
    this.$fromVirtualObjectsField=function(object,field){
	    if (field.virtual!=undefined){
	    	if (object.$virtualData[field.virtual.name]!=undefined)
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
    }
    
    this.$fromVirtualObjectsAllFields=function(object){
	    this.$fields.forEach(function(field){
			this.$fromVirtualObjectsField(object,field);	
	    },this)
    }


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
			
			if (this.$sandbox.$data[field.name]==undefined)
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
			})
			
			if (field.virtual!=undefined){
				Object.defineProperty(this.$sandbox,field.virtual.name,{
					get:function(){
						return this.$virtualData[field.virtual.name];
					},
					set:function(value){
						this.$virtualData[field.virtual.name]=value;

						$owner.$fromVirtualObjectsField(this,field);
					}
				})
			}
		},this);
		
		//Prepare virtual fields
		this.$toVirtualObjectsAllFields(this.$sandbox);
        
        if (this.onSandbox != undefined) this.onSandbox();
        return this.$sandbox;
    }
    
    this.sandboxChanges=function(){
	    this.isDestroyed("sandboxChanges");
	    
	    if (this.$sandbox == undefined)
	    	this.$sendException("Sandbox not created, use prepareSandbox before");
		
		this.$fromVirtualObjectsAllFields(this.$sandbox);
	    this.validateSandbox();
	    
	    var info={
		    raw:{},
		    changes:{},
		    countChanges:0
	    }
	    
	    this.$fields.forEach(function(field){
		    info.raw[field.name]=$this.$sandbox[field.name];
		    if ($this[field.name]!=$this.$sandbox[field.name]){
		    	info.changes[field.name]=$this.$sandbox[field.name];
				info.countChanges++;
		    }
	    })
	    
	    return info;
    }

    this.isSandboxChanged = function () {
	    this.isDestroyed("isSandboxChanged");
	    
	    return this.sandboxChanges().countChanges>0;
    }
    
    this.$confirmedSaveData=function(data,promise){
	    
	    //TODO Check if pk has changed in replace or update
	    
	    //Validate pk
	    if (this.$isNew){
		    var pkValidated=true;
		    
		    this.$fields.some(function(field){
			    if (field.pk && (data[field.name]==undefined || data[field.name]=="")){
				    pkValidated=false;
				    return false;
			    }
		    })
		    
		    if (!pkValidated)
		    	throw new ilModelException(this.$className,"Invalid pk in incoming data",{theObject:this,theIncommingData:data});
	    }
	    
	    //It's not a new object
	    var wasNew=this.$isNew;
	    this.$isNew=false;
	   
	    //Update sandbox with new data
		if (data!=undefined)
		    for (var key in data){
			    if (this.getField(key)!=undefined){
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
    }
    
    this.$confirmSandboxBasic=function(){
    	this.$isNew=false;
		this.updateFrom(this.$sandbox);
		this.validate();
		this.$toVirtualObjectsAllFields(this);
		
    }

    this.confirmSandbox = function (saveCallback) {
	    this.isDestroyed("confirmSandbox");
	    
	    var $this=this;
	    var promise=new ilModelPromise();
	    
	    var info=this.sandboxChanges();
	    
	    if (info.countChanges==0){
		    promise.ready(this);
		    return promise;
	    }
	    
	    if (saveCallback){
		    saveCallback(info).then(function(data){
			    $this.$confirmedSaveData(data,promise);
		    },
		    function(err){
			    promise.error(err);
		    })
		}
		else{
			this.$confirmSandboxBasic();
			promise.ready(this);
		}
	    
	    return promise;
    }
    
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
				})
			}
			else{
				var useReplaceInsteadModify=$this.$class.$options.useReplaceInsteadModify;
				var op="";
				var data=info.changes;
			
				if (options.useReplaceInsteadModify!=undefined)
					useReplaceInsteadModify=options.useReplaceInsteadModify;
					
				if (useReplaceInsteadModify){
					op="replace";
					data=info.raw;
				}else
					op="modify";
				
				if (options.dataProvider[op]==undefined)
					throw new ilModelException(this.$className,"Operation "+op+" isn't defined on data provider",{theObject:this,theDataProvider:options.dataProvider});
						
				options.dataProvider[op]($this.getPk(),data).then(function(data){
					promise.ready(data);
				},
				function(err){
					promise.error(err);
				})
			}
			
			return promise;
		})
    }
    
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
			})
		}
		
		return promise;
    }
    
    this.isDestroyed=function(functionName){
	    if (this.$destroyed)
	    	throw new ilModelException(this.$className,"This function cannot be used because object is destroyed",{theObject:this,theFunction:functionName})
    }
    
    this.destroy=function(){
	    //Destroy object
	    this.$sandbox=undefined;
	    this.$destroyed=true;
	    
	    
	    //Remove from cache
	    for (var k in this.$class.$cache.collections){
		    var collection=this.$class.$cache.collections[k];
		    collection.remove(this);
	    }
    }
    
    //----------------------------------------------------------------------------
    // Associations
    //----------------------------------------------------------------------------
    
    this.searchAssociation=function(assocName){
	    for (var assocName2 in this.$class.$associations){
		    if (assocName2==assocName)
				return this.$class.$associations[assocName];
		}
		
		throw new ilModelException(this.$className,"Invalid association",{theAssocName:assocName});
    }
    
    this.getAssociation=function(assocName){
	    var assoc=this.searchAssociation(assocName);
	    		
		if (this.$associations[assocName]!=undefined)
			return this.$associations[assocName];
		
		this.$associations[assocName]=assoc.get(this);
		
		return this.$associations[assocName];
    }
    
    this.invalideAssociation=function(assocName){
	    this.searchAssociation(assocName);
	    	
	    this.$associations[assocName]=undefined;
	    this.$associationsCacheData[assocName]=undefined;
	    return this.getAssociation(assocName);
    }
    
    this.updateAssociationsBySrc=function(src){
	    for (var assocName in this.$class.$associations){
		    var assoc=this.$class.$associations[assocName]; //TODO: raw associations, without options
			if (src[assoc.associated]!=undefined)
				assoc.forceRawData(this,src[assoc.associated]);
		}
    }
    
    //----------------------------------------------------------------------------
    // Class constructor
    //----------------------------------------------------------------------------
    
    this.$setupClass=function(config){
	    
	    function byDefault(object,field,value){
			if (object[field]==undefined)
				object[field]=value;
		}
		
		var $this=this;
		
		var fields=config.fields;
		var options=config.options;
		var className=config.name;
		var cache=config.cache;
		var dataProviders=config.dataProviders;
		
		if (fields==undefined || !Array.isArray(fields))
			throw new ilModelException(className,"fields must be an array specified on config",{theConfig:config});
		
		this.$className=className;
		this.$class=window[className];
		this.$class.$class=this.$class;
		this.$class.$className=className;
			
		if (options==undefined)
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
		}
		
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
	            throw new ilModelException($this.className,"Error checking field. It's not a ilModelField",item)
        })
        
        //Cache system
        if (config.cache){
	        if (!config.cache.$isCache)
	        	throw new ilModelException(this.className,"Cache object is not a cache",{theCache:config.cache});
	        	
	        this.$class.$cache=config.cache;
		}
		else if (ilModelConfiguration.cache.createCacheByDefault){
			this.$class.$cache=new ilModelCache({});
		}
		
		if (this.$class.$cache!=undefined){
			this.$cache=this.$class.$cache;
			this.$cache.init(this.$class);
		}
		
		this.$class.getCollection=function(name){
		    return this.$class.$cache.getCollection(name);
	    }
		
		//DataProviders
        this.$class.$dataProviders={};
		
		if (config.dataProviders){
	        this.$dataProviders=this.$class.$dataProviders;
	        
	        var isTheFirstDataProvider=true;
	        
	        for (var name in config.dataProviders){    
		        this.$class.$dataProviders[name]=config.dataProviders[name];
		        
		        if (this.$class.$dataProviders[name].init!=undefined){
			        try{
			        	this.$class.$dataProviders[name].init(this.$class,name);
			        }
			        catch(e){
				        throw new ilModelException("ilModel","Data provider "+name+" has an incorrect init function",this.$class.$dataProviders[name])
			        }
			    }
		        
		        if (isTheFirstDataProvider){
			        if (this.$options.defaultDataProvider==undefined)
			        	this.$options.defaultDataProvider=name;
			        
			        isTheFirstDataProvider=false;
		        }
		        
	        }
		}
		
		this.$class.getDataProvider=function(name){
		    if (this.$class.$dataProviders[name]!=undefined)
		    	return this.$class.$dataProviders[name];
		    else
		    	throw new ilModelException(this.$class.$className,"Dataprovider "+name+" doesn't exist");
	    }
		
		
		//Associations
		if (config.associations){
			this.$class.$associations=config.associations;
			
			for (var k in this.$class.$associations){
				if (!(this.$class.$associations[k] instanceof ilModelAssociation))
					throw new ilModelException(this.$className,"Association is not an ilModelAssociation",{theAssociation:this.$class.$associations[k]})
					
				this.$class.$associations[k].setup(k,this.$class);
			}
		}
		
		this.$class.getField=function(fieldName){
			for (var x=0; x<this.$fields.length; x++){
				if (this.$fields[x].name==fieldName)
					return this.$fields[x];
			}
			
			return undefined;
		}
		
		//Synthetics
		if (config.synthetics){
			this.$class.$synthetics=config.synthetics;
		}
		
		this.$class.$prepareQueryOptions=function(options){
			if (options==undefined)
				options={};
				
			if (options.forceReload==undefined)
				options.forceReload=this.$options.forceReload;
			
			if (options.forceReload==undefined)
				options.forceReload=false;
	
			if (options.dataProvider==undefined)
				options.dataProvider=this.$class.$options.defaultDataProvider;
			
			options.dataProvider=this.$class.$dataProviders[options.dataProvider];
				
			if (options.dataProvider==undefined)
				throw new ilModelException($this.$className,"There are no a data provider",options);
			
				
			return options;
		}
		
		//Extract pk from src
		this.$class.extractPK=function(src){
			var result = {};
	
	        $this.$class.$fields.forEach(function (field) {
	            if (field.pk)
	            	result[field.name]=src[field.name];
	        });
	
	        return result;
		}
		
		
		//Create a new object from src data if it doesn't exist
		//If exists, update associations
		this.$class.createIfNotExist=function(src){
			var pk=$this.$class.extractPK(src);
			
			var obj=$this.$class.getCollection().get(pk);
			
			if(obj)
				obj.updateAssociationsBySrc(src);
			else
				obj=new $this.$class(src);	
			
				
			return obj;
		}
		
		//Global getter
		this.$class.get=function(pk,options){
			var promise=new ilModelPromise({owner:this.$class,context:this.$class.$context});
			
			options=this.$prepareQueryOptions(options);
			
			if (options.forceReload){
				options.dataProvider.get(pk,options).then(promise);
			}else{
				var result=this.getCollection().get(pk);
				
				if (result!=undefined)
					promise.ready(result);
				else
					options.dataProvider.get(pk,options).then(promise);
			}
			
			return promise;
				
		}
		
		//Global all
		this.$class.all=function(options){
			var promise=new ilModelPromise({owner:this.$class,context:this.$class.$context});
			
			options=this.$prepareQueryOptions(options);
			
			var collection=this.$class.$cache.getCollection("all",{throwError:false});
			
			if (collection==undefined || options.forceReload){
				this.$class.$cache.registerCollection("all",new ilModelCollection({
					promise:options.dataProvider.all(options).then(promise)
				}))	
			}
			else{
				promise.ready(collection.data);
			}
			
			return promise;
		}
		
		//Global query
		this.$class.query=function(query,options){
			var promise=new ilModelPromise({owner:this.$class,context:this.$class.$context});
			
			options=this.$prepareQueryOptions(options);
			
			var collectionId=ilModelFieldQuery.toString(query);
			var collection=this.$class.$cache.getCollection(collectionId,{throwError:false});
			
			if (collection==undefined || options.forceReload){
				this.$class.$cache.registerCollection(collectionId,new ilModelCollection({
					promise:options.dataProvider.query(query,options).then(promise)
				}))	
			}
			else{
				promise.ready(collection.data);
			}
			
			return promise;
		}
		
		this.$class.getAssociationsOfField=function(field){
			var associations=[];
			
			for (var k in this.$associations){
				var association=this.$associations[k];
				for (var j in association.by){
					if (field.name==j){
						associations.push(association);
						break;
					}
				}
			}
			
			return associations;
		}
		
		this.$class.toModelArray=function(array){
			var list=[];
			array.forEach(function(data){
				list.push(new window[className](data));
			
			})
			return list;
		}
		
		if (config.staticMethods!=undefined){
			for (var k in config.staticMethods){
				this.$class[k]=config.staticMethods[k];
			}
		}
	}
    
    //----------------------------------------------------------------------------
    // Object constructor
    //----------------------------------------------------------------------------
    
    this.$setupObject=function(src){
	    var $this=this;
		
		//Set internal Uid
		this.$internalUid=this.$class.getNextUid()//(""+Math.random()).substring(2);
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
		}
		
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
						
						if (field.virtual!=undefined)
							this.$toVirtualObjectsField(this,field);
					}
					
					var associations=this.$class.getAssociationsOfField(field);
					if (associations.length>0){
						associations.forEach(function(association){
							this.$updateAssociation(association);
						},this);
					}
						
				}
			})
			
			if (field.virtual!=undefined){
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
					})
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
					})
				}catch(e){
					throw new ilModelException($this.$className,"Cannot define an association variable, already declared" ,{theAssociation:item});
				}
			},this)
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
					})
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
		if (this.$class.preConstructor!=undefined)
			this.$class.preConstructor(this);
		
		
		if (src == undefined) {
            this.$isNew = true;
            this.prepareSandbox();
            
            if (this.onCreate != undefined)
                this.onCreate();
            
            this.$setAndGet.lock();
            
            if (this.$options.validateOnCreateNew)
	        	this.validate()     	
        }
        else{
	        this.$isNew=false;
	        this.updateFrom(src);
	        this.updateAssociationsBySrc(src);
	        
	        this.$setAndGet.lock();
	        
	        if (this.$options.validateOnCreate)
				this.validate()
        }
		
        if (this.onInit != undefined)
            this.onInit(this.$isNew);

		if (!this.$isNew && this.$class.$cache && this.$class.$cache.autoInsert){
			this.$cache.getCollection().add(this);
		}
		
		
		
		if (this.$class.postConstructor!=undefined)
			this.$class.postConstructor(this);
    }
    
    //----------------------------------------------------------------------------
    // Init
    //----------------------------------------------------------------------------

    this.$setupClass(config);
}

//----------------------------------------------------------------------------------------------------
// Setup Class & Object constructor & Helpers
//----------------------------------------------------------------------------------------------------
ilModel.setup=function(config){
	
	if (config==undefined)
		throw new ilModelException("ilModel.setup","Confing is null");
		
	if (config.name==undefined)
		throw new ilModelException("ilModel.setup","name of class must be specified in config",{theConfig:config});
	
	if (config.context==undefined)
		config.context=ilModelConfiguration.defaultContext;
		
	if (config.defaults==undefined)
		config.defaults={}
	
	//Construcotr (with ilModel as name constructor function)
	window[config.name]=function ilModelObject(src){
		this.$setupObject(src);	
	}
	
	//Prototype
	window[config.name].prototype = new ilModel(config);
}



//----------------------------------------------------------------------------------------------------
// Fields
//----------------------------------------------------------------------------------------------------

ilModelField=function(name, type, config){
	if (config==undefined)
		config={};
	
	this.name=name;
	this.type=type;
	this.config=config;
	
	switch(this.type.toLowerCase()){
		case "guid":
			this.type="guid";
	    break;

	    case "boolean":
	    case "bool":
	        this.type = "boolean";
	        break;

		case "int":
		case "integer":
		
			this.type="int";
		break;
		
		case "float":
		case "double":
	    case "decimal":
        	this.type="float";
		break;
		
		case "string":
			this.type="string";
		break;
		
		case "datetime":
			this.type="datetime";
		break;
		default:
			throw new ilModelException("ilModelField",this.type+" is not a valid type",{theFieldName:name,theFieldType:type,theConfig:config});
			//return this.type;
	}
	
	function byDefault(value,defaultValue){
		if (value!=undefined)
			return value;
		else
			return defaultValue;
	}
	
	this.pk=byDefault(config.pk,false);
	this.readOnly=byDefault(config.readOnly,false);
	this.required=byDefault(config.required,false);
	this.noValidate=byDefault(config.noValidate,false);
	this.allowEmpty=byDefault(config.allowEmpty,true);
	this.maxLen=byDefault(config.maxLen,0);
	this.auto=byDefault(config.auto,false);
	this.byDefaultValue=config.byDefault;
	
	this.validateFnc=config.validateFnc; //TODO Check its a valid fnc
	
	
	//Virtual objects
	if (config.virtual!=undefined){
		this.virtual=config.virtual;
	}
	else if (config.derivated!=undefined){ //Compatibility with Beta 1
			this.virtual={
				name:config.derivated.name,
				toVirtual:config.derivated.toDerivated,
				fromVirtual:config.derivated.fromDerivated
			}
		}
		
	//Check is a virtual object
	if (this.virtual!=undefined && (this.virtual.name==undefined || this.virtual.toVirtual==undefined || this.virtual.fromVirtual==undefined))
		throw new ilModelException("ilModelField","Invalid virtural field configuration",{field:this});
		
	
	this.sendException=function(dueto,value){
		throw new ilModelException("ilModelField",dueto+" of "+this.name+"("+this.type+") = "+value,{field:this,value:value});
	}
	
	this.validateType=function(value){
		if (value==undefined)
			return true;
			
		switch(this.type){
			case "guid":
				return (""+value).toUpperCase().match(/^[0-9A-F]{8}-[0-9A-F]{4}-[1][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i) //v1
				|| (""+value).toUpperCase().match(/^[0-9A-F]{8}-[0-9A-F]{4}-[2][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i) //v2
				|| (""+value).toUpperCase().match(/^[0-9A-F]{8}-[0-9A-F]{4}-[3][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i) //v3
				|| (""+value).toUpperCase().match(/^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i) //v4
				|| (""+value).toUpperCase().match(/^[0-9A-F]{8}-[0-9A-F]{4}-[5][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i) //v5
				|| (""+value).toUpperCase().match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/) ;//General

			break;
			
			case "int":
				return value == parseInt(value);
			break;
			
			case "float":
				return (""+value).match(/^\d+.?\d*$/)!=null;
			break;
			
			case "string":
				return (typeof value === 'string' || value instanceof String)
			break;
			
			case "datetime":
				return (""+value).match(/^([\+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T\s]((([01]\d|2[0-3])((:?)[0-5]\d)?|24\:?00)([\.,]\d+(?!:))?)?(\17[0-5]\d([\.,]\d+)?)?([zZ]|([\+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?$/)!=null;
			break;
			default:
				return true;
			
		}
	};
	
	this.validateNull=function(value){
		return !( (value==undefined || value==null) && (this.pk || this.required) );
	}
	
	this.validate=function(value){
		
		var svalue=""+value;
		
		//Check empty
		if (svalue=="" && !this.allowEmpty){
			this.sendException("Invalid empty value",value);
		}

		//Check null or undefined		
		if (value==undefined || value==null){
			if (this.required)
				this.sendException("Required value",value);
					
			if (!this.validateNull(value))
				this.sendException("Invalid null or undefined value",value);
		}
		
		//Check type
		if (!this.validateType(value))
			this.sendException("Invalid type",value);
			
		//Check length
		if (this.type=="string"){
			if (this.maxLen>0 && svalue.length>this.maxLen)
				this.sendException("Invalid string length",value);
				
		}
		
		//Check external function
		if (this.validateFnc!=undefined && !config.validateFnc(value,this))
			this.sendException("Fails on validation function",value);
			
		return true;
	}
}

ilModelField.Configurations = {
    ReadOnly: { required: true, readOnly: true, auto: true },
    Pk: { pk: true, required: true, readOnly: true, auto: true },
}

ilModelException=function(objectName,msg,details){
	this.objectName=objectName;
	this.msg=msg;
	this.details=details;
	
	
	window["lastException"]=this;
		
		
	this.toString=function(){
		return this.objectName+" "+this.msg+" - more details in lastException global variable";
	}
}

ilModelCache=function(config){
	this.$isCache=true;
	
	this.getCollection=function(collection,options){
		if (collection==undefined)
			collection="global";
			
	    if (this.collections[collection])
	    	return this.collections[collection];
	    	
	    if (options==undefined)
	    	options={}
	    	
	    if (options.throwError==undefined)
	    	options.throwError=true;
	    
	    if (options.throwError!=false)
	    	throw new ilModelException("ilModel.$cache","Collection "+collection+" doesn't exist");
    }
    
    this.registerCollection=function(name,newCollection){
	    this.collections[name]=newCollection
	    return newCollection;
    }
	
	//--- Init
	
	this.init=function(parentClass){
		this.parentClass=parentClass;
	}
	
	if (config==undefined)
		throw new ilModelException("ilModelCache","Invalid config",config);
		
	this.config=config;
	
    if (config.autoInsert==undefined)
    	this.autoInsert=ilModelConfiguration.cache.autoInsert;
    else
    	this.autoInsert=config.autoInsert;
    	
	this.collections={
	    global :new ilModelCollection()
    }
    
    if (config.collections!=undefined)
	    for (var name in config.collections)
		    this.registerCollection(name,config.collections[name]);

}

ilModelCollection=function(config){
	this.data=[];
	
	this.updateEmitter=new ilModelEventsEmitter();
	
	if (config==undefined)
		config={}
	
	if (config.updateFnc){
		this.auto=true;
		this.ready=false;
		
		if (config.preventReload==undefined)
			config.preventReload=ilModelConfiguration.cache.collections.preventReload;
	}else{
		this.auto=false;	
		this.ready=true;
		
		if (config.data!=undefined){
			this.add(config.data);
			this.sort();
		}
			
		if (config.promise!=undefined){
			var $this=this;
			config.promise.then(function(data){
				$this.add(data);
				$this.sort();
			})
		}
	}
	
	this.config=config;
	
	this.sort=function(){
		if (this.config.sortFnc!=undefined)
			this.data.sort(this.config.sortFnc);
	}
	
	this.$add=function(object){
		if (object==undefined)
			throw new ilModelException("ilModelCollection.add","Object to insert is undefined");
		
		try{
			var pk=object.getPk();
		}
		catch(err){
			throw new ilModelException("ilModelCollection","Object to insert is not a ilModel",{theObject:object, theCollection:this});		
		}
		
		
		var where=this.where(pk);

		if (where==undefined)	
	    	this.data.push(object);
	    else{
		  	this.data[where]=object;
	    }
	    
	    this.sendUpdateEvent();
	}
	
	this.add=function(v){
	    if (this.auto)
	    	throw new ilModelException("ilModelCollection","This is an automatic collection");
	    
	    if (Array.isArray(v) || v instanceof Array){
	    	v.forEach(function(item){
		    	this.$add(item);
	    	},this)
	    }else
	    	this.$add(v);
    }
	
	this.remove=function(object){
	    var where=this.where(object.getPk());

		if (where!=undefined){
			this.data.splice(where, 1);
			this.sendUpdateEvent();
		}
		else{
			throw new ilModelException("ilModelCollection","Object cannot be removed, it doesn't exist",{theCollection:this,theObject:object});
		}
    }
    
    this.where=function(pk){
	    if (pk !== null && typeof pk !== 'object')
	    	throw new ilModelException("ilModelCollection","PK is not valid",pk);
	    
	    var result=undefined;
	    this.data.forEach(function(item,k){
		    if (item.checkPk(pk)){
			    result=k;
			    return true;
		    }
	    })
	    
	    return result;
    }
    
    this.get=function(pk){
	    if (pk !== null && typeof pk !== 'object')
	    	throw new ilModelException("ilModelCollection","PK is not valid",pk);
	    
	    var result=undefined;
	    this.data.forEach(function(item){
		    if (item.checkPk(pk)){
			    result=item;
			    return true;
		    }
	    })
	    
	    return result;
    }
    
    this.extract=function(checkFnc){
		var list=[];
	    
	    this.data.forEach(function(item){
		    if (checkFnc(item))
		    	list.push(item)
	    })
	    
	    return list;
    }
    
    this.extractCollection=function(checkFnc){
	    var srcCollection=this;
	    var newCollection=new ilModelCollection({
		    updateFnc:function(promise,params){
			    promise.ready(srcCollection.extract(checkFnc))
		    }
		});
		
		newCollection.update();
		
		this.updateEmitter.register(function(event){newCollection.eventListener(event)});
		
		return newCollection;
    }
    
    this.$requireUpdate=function(){
	    return !this.updated || !this.config.preventReload;
    }
    
    this.eventListener=function(event){
	    switch(event.type){
		    case "update":
		    	this.update();
		    break;
	    }
	    
	    return true;
    }
    
    this.sendUpdateEvent=function(){
	    this.updateEmitter.send({type:"update"}); 
    }
    
    this.update=function(){
	    if (!this.auto)
	    	throw new ilModelException("ilModelCollection","This is not an automatic collection");

	    if (this.config.updateFnc==undefined)
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
	    })

	   
	    this.config.updateFnc(promise2);
	        
		return promise;
    }
    
    this.load=function(params,options){
	    if (!this.auto)
	    	throw new ilModelException("ilModelCollection","This is not an automatic collection");
	    
	    if (options==undefined)
	    	options={}
	    	
	    var promise=new ilModelPromise({owner:this,context:this.context});
	    
		if (options.forceReload || this.$requireUpdate()){
			this.ready=false;
			var $this=this;
			var promise2=new ilModelPromise().then(
				function(data){
					
					if (Array.isArray(data) || data instanceof Array){
				    	data.forEach(function(item){
					    	$this.$add(item);
				    	},this)
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
    }
    
    this.reload=function(params,options){
	    if (options==undefined)
	    	options={}
	    	
	    options.forceReload=true;
	    
	    return this.load(options);
    }
    
    
}

ilModelCollection.createAuto=function(updateFnc){
	return new ilModelCollection({
		updateFnc:updateFnc
	});
}

ilModelAssociation=function(type,associated,by,options){
	this.type=type;
	this.associated=associated;
	this.by=by;
	this.raw=undefined;
	this.options=options;
	this.fieldName=undefined;
	this.ownerClass=undefined;
	
	if (this.options==undefined)
		this.options={};
		
	if (this.options.forceReload==undefined)
		this.options.forceReload=true;
	
	this.setup=function(fieldName,ownerClass){
		this.fieldName=fieldName;
		this.ownerClass=ownerClass;
	}	
		
	this.get=function(object){
		if (object.$associationsCacheData[this.fieldName]!=undefined){
			var promise=new ilModelPromise();
			promise.ready(object.$associationsCacheData[this.fieldName]);
			return promise;	
		}
		
		var pk={};
		
		for (var lk in this.by){
			var fk=this.by[lk];
			pk[fk]=object[lk];
		}
		
		if (window[this.associated]==undefined)
			throw new ilModelException(this.ownerClass.$className,"Model "+this.associated+" not declared As model. Don't forget create the model or load it",{});
		
		//forceReload
		
		if (this.type=="one"){
			return window[this.associated].get(pk,{forceReload:this.options.forceReload});
		}
		
		if (this.type=="multiple"){
			var queryList=[];
			for (var k in pk)
				queryList.push(ilModelFieldQuery.Equals(k,pk[k]));
			
			if (this.options.filter!=undefined)
				queryList.push(this.options.filter);
			
			var query=ilModelFieldQuery.And(queryList);

			return window[this.associated].query(query,{forceReload:this.options.forceReload});
		}
		
	}
	
	this.forceRawData=function(object,src){
		if (window[this.associated]==undefined)
			throw new ilModelException(this.ownerClass.$className,"Model "+this.associated+" not declared as model. Don't forget create the model or load it",{});
			
		if (this.type=="one"){
			object.$associationsCacheData[this.fieldName]=window[this.associated].createIfNotExist(src);
		}
		else{
			object.$associationsCacheData[this.fieldName]=[];
			
			var $this=this;
			
			src.forEach(function(item){
				object.$associationsCacheData[$this.fieldName].push(new window[$this.associated].createIfNotExist(item))
			})
		}
	}
}

//TODO: Add options for forceReload

ilModelAssociation.one=function(associated,by){
	return new ilModelAssociation("one",associated,by);	
}

//TODO: Add options for forceReload

ilModelAssociation.multiple=function(associated,by,query){
	return new ilModelAssociation("multiple",associated,by,query);	
}

ilModelHttpAngular = function (config) {
	/*
	config (is optional):
	    $http (required)
	    errorConfig(err) (optional)
	    successCodes (optional)
	*/

	this.setup=function(config){
	    if (config==undefined)
	        throw new ilModelException("ilModelHttpAngular", "Requires config in constructor");
	
	    this.config=config;
	
	    if (config.$http==undefined)
	        throw new ilModelException("ilModelHttpAngular", "Requires $http in constructor config",config);
	
	    this.$http = config.$http;
	    
	    if (config.defaultErrorCallback==undefined)
	        this.config.defaultErrorCallback = function (err) {
	            throw new ilModelException("ilModelHttpAngular", "Error in a call", err);
	        }
	
	    if (config.successCodes==undefined)
	        config.successCodes = [200, 201, 204];
	
	    if (config.defaultHeaders == undefined)
	        config.defaultHeaders = { Accept: "application/json" }
	    
	    this.$checkSuccess=function(code){
	        var found=false;
	        this.config.successCodes.some(function (item){
	            if (item==code){
	                found=true;
	                return true;
	            }
	        })
	
	        return found;
	    }
	}
	
	if (config!=undefined)
		this.setup(config);
    
    /*
    config:
        url
        success
        method (optional, by default GET)
        headers (optional)
        error (optional)
        data (optional)

    */
    this.call = function (config) {
	    var promise=new ilModelPromise();
	    
        if (config.headers != undefined)
            var headers = config.headers;
        else
            var headers = this.config.defaultHeaders;

        if (config.method == undefined)
            var method = "GET";
        else
            var method = config.method;

        if (config.url == undefined)
            throw new ilModelException("ilModelHttpAngular.call", "url is required", config);

        var call = {
            url: config.url,
            method: method,
            headers: headers
        }

        if (config.data != undefined)
            call.data = config.data;

        var $this=this;
        this.$http(call).then(
            function (result) {
	            if ($this.$checkSuccess(result.status)) {
                    promise.ready(result.data);
                } else {
                    promise.error(result)
                }
            },
            function (error) {
	            promise.error(error);
            }
        )     
   
		return promise;
   }
   
}

ilModelDataProviderOData = function (config) {
	
	if (config==undefined)
		config={}
		
	if (config.context==undefined)
		config.context=ilModelConfiguration.defaultContext;
	
	this.config=config;
	this.url=config.url;
	this.context=config.context;
	
	this.init=function(parentClass,name){
    	this.parentClass = parentClass;
    	this.name=name;
    }
    
    
    this.$preparePk=function(pk){
	    
	    if (this.config.pkMethod==undefined)
	    	this.config.pkMethod=ilModelDataProviderOData.PkMethods.firstField;
	    
	    return this.config.pkMethod(pk,this.parentClass);
	    
    }
    
    this.$get=function (config, options) {
        if (this.url==undefined || this.url=="")
        	throw new ilModelException("ilModelDataProviderOData","You must complete the url definition "+this.name+" data provider in "+this.parentClass.$className+". Ejm: "+this.parentClass.$className+".$dataProviders."+this.name+".url=\"<odata entity url>\"");
        	
        url=this.url;
        
        var promise=new ilModelPromise();
        
        if (config.pk != undefined) {
	        if (config.queryString)
            url = url + this.$preparePk(config.pk);//guid'" + config.id + "')";
        }
        

        url += "?";

        if (config.top != undefined)
            url = url + "$top=" + config.top + "&";

        if (config.skip != undefined)
            url = url + "$skip=" + config.skip + "&";

		if (config.expand != undefined)
            url = url + "$expand=" + config.expand + "&";

		if (config.select != undefined)
            url = url + "$select=" + config.select + "&";

        if (config.queryString != undefined)
            url = url + "$filter=" + config.queryString + "&";

		if (config.orderby != undefined)
			if (config.orderbyDesc != undefined && config.orderbyDesc)
				url = url + "$orderby=" + config.orderby + "desc &";
			else
				url = url + "$orderby=" + config.orderby + "&";
			
		if (config.operation != undefined)
			url = url + "$$op=" + config.operation + "&";
			
			
        if (this.config.debug) console.debug("OData", "call", call);
        var $this = this;

		var call={
			url:url,
	        method:"GET"
	    };

        this.context.http.call(call).then(
        	function(result){
		        if ($this.config.debug) console.debug("OData", "Raw result", result);
		        
		        var className=$this.parentClass;
		        
		        if (config.isList) {
	                var list = result.value;
	                var newList = [];
	                
	                list.forEach(function (item) {
	                    newList.push(className.createIfNotExist(item));
	                });
	                
	                if (config.first)
	                	promise.ready(newList[0]);
	                else
	                	promise.ready(newList);
	            }
	            else {
	                promise.ready(className.createIfNotExist(result));
	            }
	        },
	        function(err){
		        promise.error(err);
	        });
        
        return promise;
    }
    this.$call=function (method, config) {
	    var promise=new ilModelPromise({owner:this});
		
        var call = {
            method: method,
            url: this.url,
            headers: this.$headers
        };

        if (config.pk != undefined) {
            call.url = call.url + this.$preparePk(config.pk);
        }

        if (config.data != undefined)
            call.data = config.data;
		
        if (this.debug) console.debug("OData", "call", call);
        var $this = this;
        
        this.context.http.call(call).then(function (result) {
	        
	        if ($this.debug) console.debug("OData", "Raw result", result);

            if (config.isList) {
                var list = result.data.value;
                var newList = [];
                list.forEach(function (item) {
                    newList.push(item);
                });
                promise.ready(newList);
            }
            else {
                promise.ready(result);
            }
            

        }, function (error) {
	        if (error.statusText)
            	promise.error(error.statusText);
            else
            	promise.error(error);
        })
        
        return promise;
    }
    
    this.prepareOptions=function(config,options){
	    for(var k in options){
		    var value=options[k];
		    var name=k.toLowerCase();
		    
		    switch(name){
				case "top":
				case "len":
					config.top=value;
				break;    
				case "skip":
				case "init":
					config.skip=value;
				break;  
				case "expand":
					config.expand=value;
				break;
				case "select":
					config.select=value;
				break;
				case "op":
				case "operation":
					config.operation=value;
				break; 
				case "orderby":
					config.orderby=value;
				break;
				case "orderbydesc":
					config.orderbyDesc=value;
				break;
				/*
				case "filter":
					config.queryString=value;
				break; 
				*/
				case "querystring":
					config.queryString=value;
				break; 
				   
		    }
	    }
	    return config;
    }
    
    this.get=function (pk,options) {
	    
	    var list=[];
	    for (var k in pk)
	    	list.push(new ilModelFieldQuery.Equals(k,pk[k]));
	    
	    if (options!=undefined && options.filter!=undefined)
	    	list.push(options.filter);
	    	
	    var query=ilModelFieldQuery.And(list);
	    
        //return this.$get(this.prepareOptions({ pk: pk, isList:false},options));
        return this.$get(this.prepareOptions({ queryString: ilModelDataProviderOData.toQueryString(this.parentClass,query), isList: true, first:true,top:1 }, options));
    }
    
    this.query=function (query,options) {
        return this.$get(this.prepareOptions({ queryString: ilModelDataProviderOData.toQueryString(this.parentClass,query), isList: true }, options));
    }
    
    this.all=function (options) {
        return this.$get(this.prepareOptions({ isList: true }, options));
    }
    
    this.create=function (data) {
        return this.$call("POST", { data: data });
    }
    
    this.replace=function (pk, data) {
        return this.$call("PUT", { pk: pk, data: data });
    }
    
    this.modify=function (pk, data) {
        return this.$call("PATCH", { pk: pk, data: data });
    }
    
    this.remove=function (pk) {
        return this.$call("DELETE", { pk: pk });
    }
}

ilModelDataProviderOData.toQueryString=function(Model,query){
	
	switch(query.type){
		case "and":
		case "or":
			var res="";
			for (var i=0;i<query.list.length-1;i++){
				res+=ilModelDataProviderOData.toQueryString(Model,query.list[i])+" "+query.type+" ";
			}
			res+=ilModelDataProviderOData.toQueryString(Model,query.list[i]);
			
			return res;
		break;
		
		case "compare":
			var field=Model.getField(query.fieldName);
			
			if (field==undefined)
				throw new ilModelException("ilModelDataProviderOData.toQueryString","Cannot find "+query.fieldName+" field in model",{theModel:Model})
			
			var value=query.value;
			
			switch(field.type){
				case "string":
					value="'"+value+"'";
				break;
				case "guid":
					value="guid'"+value+"'";
				break;
			}
				
			var comp="";
			
			switch (query.method){
				case "=":
					return query.fieldName+" eq "+value
				break;
				case "<>":
					return query.fieldName+" ne "+value
				break;	
				case "<":
					return query.fieldName+" lt "+value
				break;
				case "<=":
					return query.fieldName+" le "+value
				break;
				case ">":
					comp=query.fieldName+" gt "+value
				break;
				case ">=":
					comp=query.fieldName+" ge "+value
				break;
				case "endswith":
					comp="endswith("+query.fieldName+","+value+")";
				break;
				case "startswith":
					comp="startswith("+query.fieldName+","+value+")";
				break;
				case "substringof":
					comp="substringof("+query.fieldName+","+value+")";
				break;
				
				//TODO: Add more options of quering, Consult https://msdn.microsoft.com/en-us/library/hh169248(v=nav.90).aspx
				//length
				//replace
				//substring
				//tolower
				//toupper
				//trim
				//concat
				//day
				//month
				//year
				//hour
				//minute
				//second
				//round
				//floor
				//ceiling
				
				
				default:
					comp=query.method
			}
			
			
			
			
			return +" "+comp;
		break;
	}
}

ilModelDataProviderOData.PkMethods={
	v3:function(pk,parentClass){
		var result="(";
	    
	    for (var name in pk){
		    var value=pk[name];
		    
		    var field=undefined;
		    
		    parentClass.$fields.some(function(field2){
				if (field2.name==name && field2.pk==true){
					field=field2;
					return true;
				}
		    })
		    
		    if (field==undefined)
		    	throw new ilModelException("ilModelDataProviderOData","Field "+name+" is not a PK of "+parentClass.$className);
		    
		    result+=name+"=";
		    
		    switch(field.type){
			    case "guid":
			    	result+="guid'"+value+"'";
			    break;
			    case "int":
			    case "float":
			    	result+=value
			    break;
			    
			    default:
			    	result+="'"+value+"'"
		    }
		    
		    result+=",";
	    }
	    
	    result.substr(0,result.length-1);; //Remove last ,
	    
	    result+=")";
	    
	    return result;	
	},
	firstField:function(pk,parentClass){
		var result="("
	    
	    for (var name in pk){
		    var value=pk[name];
		    
		    var field=undefined;
		    
		    parentClass.$fields.some(function(field2){
				if (field2.name==name && field2.pk==true){
					field=field2;
					return true;
				}
		    })
		    
		    if (field==undefined)
		    	throw new ilModelException("ilModelDataProviderOData","Field "+name+" is not a PK of "+parentClass.$className);
		    
		    switch(field.type){
			    case "guid":
			    	result+="guid'"+value+"'";
			    break;
			    case "int":
			    case "float":
			    	result+=value
			    break;
			    
			    default:
			    	result+="'"+value+"'"
		    }
		    
		    break; //Only one
	    }
	    
	    result+=")";
	    
	    return result;
	}
}

ilModelPromise=function(options){
	this.data=undefined;
	this.isLoading=true;
	this.isError=false;
	this.hasFinished=false;
	
	this.successEmitter=new ilModelEventsEmitter();
	this.errorEmitter=new ilModelEventsEmitter();
	
	if (options==undefined)
		options={}
		
	if (options.context==undefined)
		this.context=ilModelConfiguration.defaultContext;
	else
		this.context=options.context;
		
	if (options.owner!=undefined)
		this.owner=options.owner;
	
	this.ready=function(data){
		this.data=data;
		this.isLoading=false;
		this.hasFinished=true;
		
		var $this=this;
		this.context.delayFnc(function(){
			if ($this.successEmitter.length()>0)
				$this.successEmitter.send($this.data);
		})
		
	}
		
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
		})
	}
	
	this.then=function(callback,errorCallback){
		if (!this.hasFinished){
			if (callback instanceof ilModelPromise){
				this.successEmitter.register(function(data){callback.ready(data)});
				this.errorEmitter.register(function(err){callback.error(err)});
			}
			else{
				this.successEmitter.register(callback);
				this.errorEmitter.register(errorCallback);
			}
		}
		else{
			var $this=this;
			this.context.delayFnc(function(){
				if (!$this.isError){
					if (callback instanceof ilModelPromise){
						callback.ready($this.data)
					}
					else{
						callback($this.data);
					}
				}
				else{
					if (callback instanceof ilModelPromise){
						errorCallback.error($this.error)
					}
					else{
						errorCallback(error);
					}
				}
			})
			
		}
		
		
		return this;
	}

	
	if (options.data!=undefined){
		this.ready(options.data);
	}
}

ilModelPromiseSync=function(options){
	//IMPORTANT: Don't use for
	
	this.isLoading=true;
	this.isError=false;
	this.hasFinished=false;
	
	this.successEmitter=new ilModelEventsEmitter();
	this.errorEmitter=new ilModelEventsEmitter();
	
	if (options==undefined)
		options={}
		
	if (options.context==undefined)
		this.context=ilModelConfiguration.defaultContext;
	else
		this.context=options.context;
		
	if (options.owner!=undefined)
		this.owner=options.owner;
	
	this.syncList=[];
	
	this.addTask=function(startFunction,options){
		var task=this.add(options);
		startFunction(task);
	}
	
	this.add=function(options){
		this.isLoading=true;
		this.hasFinished=false;
			
		if (options==undefined)
			options={};
			
		var syncObject={
			id:this.syncList.length,
			
			options:options,
			
			sync:this,
			
			isLoading:true,
			isError:false,
			hasFinished:false,
			
			data:undefined,
			error:undefined,
			
			ready:function(data){
				if (this.hasFinished)
					throw new ilModelException("ilModelPromiseSync.object","This sync is already finished",{theSyncObject:this});
				
				this.hasFinished=true;
				this.isLoading=false;
				this.data=data;
				this.sync.ready(this);
			},
			error:function(err){
				if (this.hasFinished)
					throw new ilModelException("ilModelPromiseSync.object","This sync is already finished",{theSyncObject:this});
				
				this.hasFinished=true;
				this.isLoading=false;
				this.isError=true;
				this.error=err;
				this.sync.ready(this);
			}
		};
			
		this.syncList.push(syncObject);
		
		return syncObject;
	}
	
	this.ready=function(syncObject){
		var allFinished=true;
		
		this.syncList.some(function(syncObject){
			if (!syncObject.hasFinished){
				allFinished=false;
				return false;
			}
		});
		
		if (allFinished){
			this.isLoading=false;
			this.hasFinished=true;
			
			var anyError=false;
		
			this.syncList.some(function(syncObject){
				if (syncObject.isError){
					anyError=true;
					return true;
				}
			});
			
			if (!anyError){
				var $this=this;
				this.context.delayFnc(function(){
					if ($this.successEmitter.length()>0)
						$this.successEmitter.send($this.syncList);
				})	
			}
			else{
				var $this=this;
				this.context.delayFnc(function(){
					if ($this.errorEmitter.length()>0)
						$this.errorEmitter.send($this.syncList);
					else
						throw new ilModelException("ilModelPromise","Error loading data",{theOwner:$this.owner,error:err});
				})
				
				
			}
		}
		
	}
		
	this.then=function(callback,errorCallback){
		if (!this.hasFinished){
			if (callback instanceof ilModelPromise){
				this.successEmitter.register(function(data){callback.ready(data)});
				this.errorEmitter.register(function(err){callback.error(err)});
			}
			else{
				this.successEmitter.register(callback);
				this.errorEmitter.register(errorCallback);
			}
		}
		else{
			var $this=this;
			this.context.delayFnc(function(){
				if (!$this.isError){
					if (callback instanceof ilModelPromise){
						callback.ready($this.data)
					}
					else{
						callback($this.data);
					}
				}
				else{
					if (callback instanceof ilModelPromise){
						errorCallback.error($this.error)
					}
					else{
						errorCallback(error);
					}
				}
			})
			
		}
		
		
		return this;
	}
	
	this.progress=function(){
		var completed=0;
		
		this.syncList.forEach(function(syncObject){
			if (syncObject.hasFinished)
				completed++;
		});
		
		return {completed:completed,total:this.syncList.length};
	}
}

ilModelValidations={
	email:function(value){
		return value.match(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/)!=null;
	}
}

ilModelConfiguration={
	basics:{
		validateOnCreate:true,
		validateOnCreateNew:false,
		validateGenerateException:true,
		
	},
	dataProviders:{
		forceReload:false,
		useReplaceInsteadModify:false,
	},
	cache:{
		createCacheByDefault:true,
		autoInsert:true,
		collections:{
			preventReload:true
		}
	},
	defaultContext:{
		delayFnc:function(callback){setTimeout(callback)},
		http:undefined
	},
	
	setupDefaultAngularContext:function($http,$timeout){
		ilModelConfiguration.defaultContext.http=new ilModelHttpAngular();
		ilModelConfiguration.defaultContext.http.setup({$http:$http});
		
		ilModelConfiguration.defaultContext.delayFnc=function(callback){
			$timeout(callback)
		}
	}
}

ilModelFieldQuery={
	Equals:function(fieldName,value,options){
		return ilModelFieldQuery.Compare("=",fieldName,value,options);
	},
	NotEquals:function(fieldName,value,options){
		return ilModelFieldQuery.Compare("<>",fieldName,value,options);
	},
	LessThan:function(fieldName,value,options){
		return ilModelFieldQuery.Compare("<",fieldName,value,options);
	},
	LessOrEqualThan:function(fieldName,value,options){
		return ilModelFieldQuery.Compare("<=",fieldName,value,options);
	},
	GreaterThan:function(fieldName,value,options){
		return ilModelFieldQuery.Compare(">",fieldName,value,options);
	},
	GreaterOrEqualThan:function(fieldName,value,options){
		return ilModelFieldQuery.Compare(">=",fieldName,value,options);
	},
	Compare:function(comp,fieldName,value,options){
		return {
			type:"compare",
			method:comp,
			fieldName:fieldName,
			value:value,
			options:options
		}
	},
	Filter:function(filter,fieldName,options){
		return {
			type:"filter",
			method:filter,
			fieldName:fieldName,
			options:options
		}
	},
	And:function(list){
		if (!Array.isArray(list))
			list=[list];
			
		return {
			type:"and",
			list:list
		}
	},
	Or:function(list){
		if (!Array.isArray(list))
			list=[list];
			
		return {
			type:"or",
			list:list
		}
	},
	Not:function(query){
		return {
			type:"not",
			query:query
		}
	},
	
	toString:function(query){
		var ret="";
		
		switch(query.type){
			case "and":
			case "or":
				ret+=query.type+"(";
				query.list.forEach(function(item){
					ret+=ilModelFieldQuery.toString(item)+",";
				})
			break;
			case "compare":
				ret+=query.fieldName+query.method+query.value;
			break;
			case "filter":
				ret+=query.method+"("+query.fieldName+")";
		}
		
		return ret;
	}
}

ilModelEventsEmitter=function(){
	this.list=[];
	
	this.register=function(fnc){
		this.list.push(fnc);
	}
	
	this.send=function(event){
		var newList=[];
		
		for (var x=0; x<this.list.length; x++){
			var fnc=this.list[x];
			
			if (fnc(event)!=false)
				newList.push(fnc);
		}
		
		this.list=newList;
	}
	
	this.length=function(){
		return this.list.length;
	}
}