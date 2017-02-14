/*
    MIT LICENSE @2016 Ivan Lausuch <ilausuch@gmail.com>
    Developed at CEU University
*/

ilModelHttpAngular = function (config) {
	/*
	config (is optional):
	    $http (required)
	    errorConfig(err) (optional)
	    successCodes (optional)
	*/

	this.setup=function(config){
	    if (config===undefined)
	        throw new ilModelException("ilModelHttpAngular", "Requires config in constructor");
	
	    this.config=config;
	
	    if (config.$http===undefined)
	        throw new ilModelException("ilModelHttpAngular", "Requires $http in constructor config",config);
	
	    this.$http = config.$http;
	    
	    if (config.defaultErrorCallback===undefined)
	        this.config.defaultErrorCallback = function (err) {
	            throw new ilModelException("ilModelHttpAngular", "Error in a call", err);
	        };
	
	    if (config.successCodes===undefined)
	        config.successCodes = [200, 201, 204];
	
	    if (config.defaultHeaders === undefined)
	        config.defaultHeaders = { Accept: "application/json" };
	    
	    this.$checkSuccess=function(code){
	        var found=false;
	        this.config.successCodes.some(function (item){
	            if (item===code){
	                found=true;
	                return true;
	            }
	        });
	
	        return found;
	    };
	};
	
	if (config!==undefined)
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
	    
        if (config.headers !== undefined)
            var headers = config.headers;
        else
            var headers = this.config.defaultHeaders;

        if (config.method === undefined)
            var method = "GET";
        else
            var method = config.method;

        if (config.url === undefined)
            throw new ilModelException("ilModelHttpAngular.call", "url is required", config);

        var call = {
            url: config.url,
            method: method,
            headers: headers
        };

        if (config.data !== undefined)
            call.data = config.data;

        var $this=this;
        this.$http(call).then(
            function (result) {
	            if ($this.$checkSuccess(result.status)) {
                    promise.ready(result.data);
                } else {
                    promise.error(result);
                }
            },
            function (error) {
	            promise.error(error);
            }
        );   
   
        return promise;
   };
   
};