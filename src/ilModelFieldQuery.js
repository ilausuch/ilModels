/*
    MIT LICENSE @2016 Ivan Lausuch <ilausuch@gmail.com>
    Developed at CEU University
*/

/* global ilModelFieldQuery */

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
		};
	},
	Filter:function(filter,fieldName,options){
		return {
			type:"filter",
			method:filter,
			fieldName:fieldName,
			options:options
		};
	},
	And:function(list){
		if (!Array.isArray(list))
			list=[list];
			
		return {
			type:"and",
			list:list
		};
	},
	Or:function(list){
		if (!Array.isArray(list))
			list=[list];
			
		return {
			type:"or",
			list:list
		};
	},
	Not:function(query){
		return {
			type:"not",
			query:query
		};
	},
	
	toString:function(query){
		var ret="";
		
		switch(query.type){
			case "and":
			case "or":
				ret+=query.type+"(";
				query.list.forEach(function(item){
					ret+=ilModelFieldQuery.toString(item)+",";
				});
			break;
			case "compare":
				ret+=query.fieldName+query.method+query.value;
			break;
			case "filter":
				ret+=query.method+"("+query.fieldName+")";
		}
		
		return ret;
	}
};