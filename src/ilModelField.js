/*
    MIT LICENSE @2016 Ivan Lausuch <ilausuch@gmail.com>
    Developed at CEU University
*/

ilModelField=function(name, type, config){
	if (config===undefined)
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
		if (value!==undefined)
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
	if (config.virtual!==undefined){
		this.virtual=config.virtual;
	}
	else if (config.derivated!==undefined){ //Compatibility with Beta 1
			this.virtual={
				name:config.derivated.name,
				toVirtual:config.derivated.toDerivated,
				fromVirtual:config.derivated.fromDerivated
			};
		}
		
	//Check is a virtual object
	if (this.virtual!==undefined && (this.virtual.name===undefined || this.virtual.toVirtual===undefined || this.virtual.fromVirtual===undefined))
		throw new ilModelException("ilModelField","Invalid virtural field configuration",{field:this});
		
	
	this.sendException=function(dueto,value){
		throw new ilModelException("ilModelField",dueto+" of "+this.name+"("+this.type+") = "+value,{field:this,value:value});
	};
	
	this.validateType=function(value){
		if (value===undefined)
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
				return value === parseInt(value);
			break;
			
			case "float":
				return (""+value).match(/^\d+.?\d*$/)!==null;
			break;
			
			case "string":
				return (typeof value === 'string' || value instanceof String);
			break;
			
			case "datetime":
				return (""+value).match(/^([\+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T\s]((([01]\d|2[0-3])((:?)[0-5]\d)?|24\:?00)([\.,]\d+(?!:))?)?(\17[0-5]\d([\.,]\d+)?)?([zZ]|([\+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?$/)!==null;
			break;
			default:
				return true;
			
		}
	};
	
	this.validateNull=function(value){
		return !( (value===undefined || value===null) && (this.pk || this.required) );
	};
	
	this.validate=function(value){
		
		var svalue=""+value;
		
		//Check empty
		if (svalue==="" && !this.allowEmpty){
			this.sendException("Invalid empty value",value);
		}

		//Check null or undefined		
		if (value==undefined || value==null){
			if (this.required)
				this.sendException("Required value",value);
					
			if (!this.validateNull(value))
				this.sendException("Invalid null or undefined value",value);
		}
		else{
                    //Check type
                    if (!this.validateType(value))
                            this.sendException("Invalid type",value);
			
                    //Check length
                    if (this.type==="string"){
                            if (this.maxLen>0 && svalue.length>this.maxLen)
                                    this.sendException("Invalid string length",value);
                    }

                    //Check external function
                    if (this.validateFnc!==undefined && !config.validateFnc(value,this))
                            this.sendException("Fails on validation function",value);
                }
                    
		return true;
	};
};

ilModelField.Configurations = {
    ReadOnly: { required: true, readOnly: true, auto: true },
    Pk: { pk: true, required: true, readOnly: true, auto: true }
};