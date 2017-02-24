/*
    MIT LICENSE @2016 Ivan Lausuch <ilausuch@gmail.com>
    Developed at CEU University
*/

ilModelEventsEmitter=function(){
    this.list=[];

    this.register=function(fnc){
        if (typeof fnc !== "function")
            throw new ilModelException("ilModelEventsEmitter.register","fnc is not a function",{theFnc:fnc});
        
        this.list.push(fnc);
    };

    this.send=function(event){
        var newList=[];

        for (var x=0; x<this.list.length; x++){
                var fnc=this.list[x];

                if (fnc(event)!==false)
                        newList.push(fnc);
        }

            this.list=newList;
    };

    this.length=function(){
            return this.list.length;
    };
};