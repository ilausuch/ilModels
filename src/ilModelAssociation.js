/*
    MIT LICENSE @2016 Ivan Lausuch <ilausuch@gmail.com>
    Developed at CEU University
*/

/* global ilModelFieldQuery */

ilModelAssociation=function(type,associated,by,query,options){
	this.type=type;
	this.associated=associated;
	this.by=by;
	this.raw=undefined;
	this.options=options;
	this.fieldName=undefined;
	this.ownerClass=undefined;
	
	if (this.options===undefined)
            this.options={};
		
	if (this.options.forceReload===undefined)
            this.options.forceReload=true;
	
	this.setup=function(fieldName,ownerClass){
            this.fieldName=fieldName;
            this.ownerClass=ownerClass;
	};	
		
	this.get=function(object){
            if (object.$associationsCacheData[this.fieldName]!==undefined){
                    var promise=new ilModelPromise();
                    promise.ready(object.$associationsCacheData[this.fieldName]);
                    return promise;	
            }

            var pk={};

            for (var lk in this.by){
                var fk=this.by[lk];
                pk[fk]=object[lk];
            }

            if (window[this.associated]===undefined)
                throw new ilModelException(this.ownerClass.$className,"Model "+this.associated+" not declared As model. Don't forget create the model or load it",{});

            //forceReload

            if (this.type==="one"){
                return window[this.associated].get(pk,{forceReload:this.options.forceReload});
            }

            if (this.type==="multiple"){
                var queryList=[];
                for (var k in pk)
                        queryList.push(ilModelFieldQuery.Equals(k,pk[k]));

                if (this.options.filter!==undefined)
                        queryList.push(this.options.filter);

                var query=ilModelFieldQuery.And(queryList);

                return window[this.associated].query(query,options);
            }
		
	};
	
	this.forceRawData=function(object,src){
            if (window[this.associated]===undefined)
                    throw new ilModelException(this.ownerClass.$className,"Model "+this.associated+" not declared as model. Don't forget create the model or load it",{});

            if (this.type==="one"){
                    object.$associationsCacheData[this.fieldName]=window[this.associated].createIfNotExist(src);
            }
            else{
                    object.$associationsCacheData[this.fieldName]=[];

                    var $this=this;

                    src.forEach(function(item){
                            object.$associationsCacheData[$this.fieldName].push(window[$this.associated].createIfNotExist(item));
                    });
            };
	};
};

//TODO: Add options for forceReload

ilModelAssociation.one=function(associated,by,options){
	return new ilModelAssociation("one",associated,by,undefined,options);	
};

//TODO: Add options for forceReload

ilModelAssociation.multiple=function(associated,by,query,options){
	return new ilModelAssociation("multiple",associated,by,query,options);	
};