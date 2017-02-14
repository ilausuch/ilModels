/*
    MIT LICENSE @2016 Ivan Lausuch <ilausuch@gmail.com>
    Developed at CEU University
*/

/* global ilModelConfiguration, ilModelFieldQuery */

ilModelDataProviderOData = function (config) {
	
	if (config===undefined)
		config={};
		
	if (config.context===undefined)
		config.context=ilModelConfiguration.defaultContext;
	
	this.config=config;
	this.url=config.url;
	this.context=config.context;
	
	this.init=function(parentClass,name){
    	this.parentClass = parentClass;
    	this.name=name;
    };
    
    
    this.$preparePk=function(pk){
	    
	    if (this.config.pkMethod===undefined)
	    	this.config.pkMethod=ilModelDataProviderOData.PkMethods.firstField;
	    
	    return this.config.pkMethod(pk,this.parentClass);
	    
    };
    
    this.$get=function (config, options) {
        if (this.url===undefined || this.url==="")
        	throw new ilModelException("ilModelDataProviderOData","You must complete the url definition "+this.name+" data provider in "+this.parentClass.$className+". Ejm: "+this.parentClass.$className+".$dataProviders."+this.name+".url=\"<odata entity url>\"");
        	
        url=this.url;
        
        var promise=new ilModelPromise();
        
        if (config.pk !== undefined) {
	        if (config.queryString)
            url = url + this.$preparePk(config.pk);//guid'" + config.id + "')";
        }
        

        url += "?";

        if (config.top !== undefined)
            url = url + "$top=" + config.top + "&";

        if (config.skip !== undefined)
            url = url + "$skip=" + config.skip + "&";

		if (config.expand !== undefined)
            url = url + "$expand=" + config.expand + "&";

		if (config.select !== undefined)
            url = url + "$select=" + config.select + "&";

        if (config.queryString !== undefined)
            url = url + "$filter=" + config.queryString + "&";

		if (config.orderby !== undefined)
			if (config.orderbyDesc !== undefined && config.orderbyDesc)
				url = url + "$orderby=" + config.orderby + "desc &";
			else
				url = url + "$orderby=" + config.orderby + "&";
			
		if (config.operation !== undefined)
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
    };
    
    this.$call=function (method, config) {
	    var promise=new ilModelPromise({owner:this});
		
        var call = {
            method: method,
            url: this.url,
            headers: this.$headers
        };

        if (config.pk !== undefined) {
            call.url = call.url + this.$preparePk(config.pk);
        }

        if (config.data !== undefined)
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
        });
        
        return promise;
    };
    
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
    };
    
    this.get=function (pk,options) {
	    
	    var list=[];
	    for (var k in pk)
	    	list.push(new ilModelFieldQuery.Equals(k,pk[k]));
	    
	    if (options!==undefined && options.filter!==undefined)
	    	list.push(options.filter);
	    	
	    var query=ilModelFieldQuery.And(list);
	    
        //return this.$get(this.prepareOptions({ pk: pk, isList:false},options));
        return this.$get(this.prepareOptions({ queryString: ilModelDataProviderOData.toQueryString(this.parentClass,query), isList: true, first:true,top:1 }, options));
    };
    
    this.query=function (query,options) {
        return this.$get(this.prepareOptions({ queryString: ilModelDataProviderOData.toQueryString(this.parentClass,query), isList: true }, options));
    };
    
    this.all=function (options) {
        return this.$get(this.prepareOptions({ isList: true }, options));
    };
    
    this.create=function (data) {
        return this.$call("POST", { data: data });
    };
    
    this.replace=function (pk, data) {
        return this.$call("PUT", { pk: pk, data: data });
    };
    
    this.modify=function (pk, data) {
        return this.$call("PATCH", { pk: pk, data: data });
    };
    
    this.remove=function (pk) {
        return this.$call("DELETE", { pk: pk });
    };
};

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
			
			if (field===undefined)
				throw new ilModelException("ilModelDataProviderOData.toQueryString","Cannot find "+query.fieldName+" field in model",{theModel:Model});
			
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
					return query.fieldName+" eq "+value;
				break;
				case "<>":
					return query.fieldName+" ne "+value;
				break;	
				case "<":
					return query.fieldName+" lt "+value;
				break;
				case "<=":
					return query.fieldName+" le "+value;
				break;
				case ">":
					comp=query.fieldName+" gt "+value;
				break;
				case ">=":
					comp=query.fieldName+" ge "+value;
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
				//TODO length
				//TODO replace
				//TODO substring
				//TODO tolower
				//TODO toupper
				//TODO trim
				//TODO concat
				//TODO day
				//TODO month
				//TODO year
				//TODO hour
				//TODO minute
				//TODO second
				//TODO round
				//TODO floor
				//TODO ceiling
				
				
				default:
					comp=query.method;
			}
			
			
			
			
			return +" "+comp;
		break;
	}
};

ilModelDataProviderOData.PkMethods={
	v3:function(pk,parentClass){
		var result="(";
	    
	    for (var name in pk){
		    var value=pk[name];
		    
		    var field=undefined;
		    
		    parentClass.$fields.some(function(field2){
				if (field2.name===name && field2.pk===true){
					field=field2;
					return true;
				}
		    });
		    
		    if (field===undefined)
		    	throw new ilModelException("ilModelDataProviderOData","Field "+name+" is not a PK of "+parentClass.$className);
		    
		    result+=name+"=";
		    
		    switch(field.type){
			    case "guid":
			    	result+="guid'"+value+"'";
			    break;
			    case "int":
			    case "float":
			    	result+=value;
			    break;
			    
			    default:
			    	result+="'"+value+"'";
		    }
		    
		    result+=",";
	    }
	    
	    result.substr(0,result.length-1);; //Remove last ,
	    
	    result+=")";
	    
	    return result;	
	},
	firstField:function(pk,parentClass){
		var result="(";
	    
	    for (var name in pk){
		    var value=pk[name];
		    
		    var field=undefined;
		    
		    parentClass.$fields.some(function(field2){
				if (field2.name===name && field2.pk===true){
					field=field2;
					return true;
				}
		    });
		    
		    if (field===undefined)
		    	throw new ilModelException("ilModelDataProviderOData","Field "+name+" is not a PK of "+parentClass.$className);
		    
		    switch(field.type){
			    case "guid":
			    	result+="guid'"+value+"'";
			    break;
			    case "int":
			    case "float":
			    	result+=value;
			    break;
			    
			    default:
			    	result+="'"+value+"'";
		    }
		    
		    break; //Only one
	    }
	    
	    result+=")";
	    
	    return result;
	}
};