# ilModels

[Click here to full experience documentation](https://stackedit.io/viewer#!provider=gist&gistId=c9019cf72e58bba7eb3f9e6c1cd845ad&filename=ilModels.gettingStarted.md)

ilModels a library that simplifies data management of objects provided by OData, RestApi or others Webservices.

For each model you can:

* Declare fields with type check, custom validation and other modifiers.
* Full read/write virtual fields linked to real ones. If you modify the real field or virtual one, other will change.
* Association between models with data loading.
* Provides a Sandbox for edition.
* Global cache for each model and prevent of reloading.
* Read-only calculated fields.
* Object and static methods definitions. 
* Easy load, query, and store functions.

Other:

* OData full feature data provider
* Define custom data providers
* Define filtered collections from other one.  
* Define sync operations


## Examples


Example 1. Loading all customers and their purchases

```javascript
Customer.all({expand:Purchase}).then(function(customers){
	customers.forEach(function(customer){
		console.debug(customer.Name + " has made " + customer.PurchaseList.length + " purchases");
	});
});

```

Example 2. Load and update Customer name

```javascript
Customer.get({Id:....}).then(function(customer){
	customer.prepareSandbox();
	customer.$sandbox.name="other name";
	customer.save().then(function(){
		alert("Name updated");	
	});	
});

```

## License

MIT LICENSE @2016 Ivan Lausuch <ilausuch@gmail.com>
Developed at CEU University


## Index
[TOC]

## <i class="icon-download"></i> Getting data

There are 3 functions to get data from data providers (DP)

`Product.all(<options>)` 
: Get all MyClass from DP. 

`Product.query(<query>,<options>)` 
: Get a set of elements

`Product.get(<pk>,<options>)` 
: Get one element

### Promise as result

```JS
Product.all().then(function(data){
	//TODO
},function(err){
	//TODO when error (this is optional)
});
```
### Options

These operations only works if Data Provider is compatible, such as OData Provider

#### **Expand**

In this example get a complete purchase information (Products and Customer)

```JS
Pruchase.get({Id:"...."},{expand:"PurchaseProduct/Product,Customer"}).then(function(data){
	//TODO
});
```

#### **Filter**

Get all Purchases of a Customer (customer) and total price is upper than 100

```JS
Pruchase.query(
	ilModelFieldQuery.And([
		ilModelFieldQuery.Equals("CustomerPK",customer.Id),
		ilModelFieldQuery.GreaterThan("TotalPrice",100)	
	])
).then(function(data){
	//TODO
});
```

Basic operations:

* Equals(fieldName,value,options
* NotEquals:function(fieldName,value,options)
* LessThan:function(fieldName,value,options)
* LessOrEqualThan:function(fieldName,value,options)
* GreaterThan:function(fieldName,value,options)
* GreaterOrEqualThan:function(fieldName,value,options)
* Compare:function(comp,fieldName,value,options)

Boolean operations:

* And:function(list)
* Or:function(list)
* Not:function(query)

Filters:
	
* Filter:function(filter,fieldName,options)


#### **Force reload data**

```JS
Product.all({forceReload:true}).then(function(data){
	//TODO
});
```

#### **Order by**

Ascending order by StartDate

```JS
Product.all({orderby:"StartDate"}).then(function(data){
	//TODO
});
```

Descending order by StartDate

```JS
Product.all({orderby:"StartDate",orderbyDesc:true}).then(function(data){
	//TODO
});
```

#### **Max result length**

Returns only one element

```JS
Product.all({top:1}).then(function(data){
	//TODO
});
```

#### **Paginating**

Returns the 4th page. Each page has 5 elements

```JS
Product.all({skip:20,top:5}).then(function(data){
	//TODO
});
```

#### **Selecting**

```JS
Product.all({select:"Id,Name"}).then(function(data){
	//TODO
});
```

#### **Operation**

Executes an operation

```JS
Product.all({op:"calculePrices"}).then(function(data){
	//TODO
});
```


## <i class="icon-pencil"></i> Editing/Sandbox and saving

```flow
op1=>operation: prepareSandbox()
op2=>operation: Modify sandbox values
op3=>operation: save()
cond=>condition: Yes or No?

op1->op2->op3
```

In this example the price of product is incremented 10%

```JS
Product.get({Id:"...."}).then(function(product){

	//Before editing a model sandbox must be created
	product.prepareSandbox();

	//Always modify in sandbox	
	product.$sandbox.Price=
		product.$sandbox.Price*1.1;
	
	//Save the object usign the data provider
	product.save().then(function(){
		alert("Product updated");
	});
});
```

> **Note:** In your form use $sandbox as model to the components

> **Note:** After save, sandbox will be deleted. prepareSandbox must be called again to continue editing

#### Check if there are changes

```JS
product.isSandboxChanged()
```

#### <i class="icon-check"></i> Validations

Sandbox validation can be checked using these operations:

validateSandbox() 
: Validate all sandbox

validateSandboxField(fieldName) 
: Validate one field

Check a name field and change style class if it's invalid (angularjs)

```JS
<input 
	ng-model="product.$sandbox.name" 
	ng-class="{'error':!product.validateSandboxField('name')}>
```
## <i class="icon-doc"></i> Creating new objects


```flow
op0=>operation: create
op1=>operation: prepareSandbox()
op2=>operation: Modify sandbox values
op3=>operation: save()
cond=>condition: Yes or No?

op0->op1->op2->op3
```

Example of creation of new product:

```JS
//Create a new product
var newProduct=new Product();

//Prepare sandbox and modify values
newProduct.prepareSandbox();
newProduct.$sandbox.Name="My new product";
newProduct.$sandbox.Price=10;

//Save object
newProduct.save().then(function(){

});
```

After save, newProduct has auto assigned ID and other by default values.

## <i class="icon-trash"></i> Deleting

To delete a model object use remove

```JS
product.remove().then(function(){
	alert("Deleted!");
});
```

> **Important!** After deleting, object remains in navigation memory, but operations has not efects or are unknown. If you want to check if an object has been deleted you can use `product.$destroyed` to check it.




## <i class="icon-login"></i> Associations

When an association is declared, object model will has a field (promise type) with the same name. For instant, in the association between purchase and customer:

A Purchase is related to one Customer. In Purchase Model
```
associations:{
	$Customer:ilModelAssociation.one("Customer",{customerFK:"Id"}
}
```

A Customer is related to multiple Purchases. In Customer Model:
```
associations:{
	$Purchases:ilModelAssociation.multiple("Customer",{Id:"customerFK"}
}
```

### Loading association

To navigate, first associations you must ensure it has been loaded manually or with expand method.

This is an example of manual method

```JS
myPurchase.$Customer.then(function(){
	//Customer is already loaded
});
```

### Navigate

Navigate from Purchase to Customer:

```JS
//Alert with customer name
alert(myPurchase.$Customer.data.Name);
```

Navigate from Customer to Purchase:

```JS
myCustomer.$Purchases.data.forEach(function(purchase){
	//Do someting with purchase
});
```

>**Note:** If you try to access to fields of unloaded association will be genearated an exception. But AngularJS manages these exceptions and it's not necesary to do the preload

```JS
<p>Total : {{myPurchase.TotalPrice}}<p>
<p>Customer : {{myPurchase.$Customer.data.Name}}</p>
```

#### Create a syntethic to navigate

To be simple it's interesting to create syntetic fields to navigate.

In this example has been declared a Customer field to access directly to customer and CustomerName to access directly to the name of the customer

```JS
syntetic:{
	Customer:function(object){
		return object.$Customer.data;
	},
	CustomerName:function(object){
		if (object.$Customer.data==undefined)
			return "";
		
		return object.$Customer.data.Name;
	}
}
```

These examples returns the same:
```JS
var name=myPurchase.$Customer.data.Name
var name=myPurchase.Customer.Name
var name=myPurchase.CustomerName
```


### Reload and association

If you are creating or deleting objects related to others you must ensure to reload associations. To force a reload you must previously invalidate an association

```javascript
	//Create a new purchase
	var myPurchase=new Purchase();
	myPurchase.prepareSandbox();
	myPurchase.$sandbox.CustomerFK=myCustomer.Id;
	
	//Save the purchase
	myPurchase.save().then(function(){
		
		//Invalide Customer purchases
		myCustomer.invalideAssociation("$Purchases");
	
		//Reload Customer purchases
		myCustomer.$Purchases.then(function(){
			//TODO: All data is correct now
		})
	});
	
```

## <i class="icon-spinner"></i> Usign Promises

There are multiple examples of use but, promise can be used in other ways.

### Basic usage

```javascript
myPromise.then(function(data){
	//TODO : Callback when all is correct
},function(err){
	//TODO : Callback when something wrong happens
});
```

> **Note:** If you don't define an error callback then an exeption will throw if something wrong happens 

### Extended usage

No mathers how many callback you add to promise. All callback will be called. 

In the example when `myPromise` finishes "callback 1" and "callback 2" messages will be showed.

```javascript
myPromise.then(function(data){
	alert("callback 1");
})

myPromise.then(function(data){
	alert("callback 2");
});
```

An other promise can be a callback too. In folowing example,  `myPromise2` will be called when myPromise finish

```javascript
myPromise.then(myPromise2)
```



### Creating your own promises

In some cases is interesting create a promise. It's simple

```javascript
var myPromise=new ilModelPromise();
```

To finish the promise call to `ready`

```javascript
myPromise.ready(myData);
```

To send an error as result of promise call to `error`

```javascript
myPromise.error("This is an error text");
```

Example using Angular

```javascript
function getSomeThingDataFromURL(){
	var promise=new ilModelPromise();
	
	$http({
		method: 'GET',
		url: '/someUrl'
	}).then(function successCallback(response) {
		promise.ready(response);  
	}, function errorCallback(response) {
	    promise.error(response);
	});
		
	return promise;
}
...
getSomeThingDataFromURL().then(function(data){
	//TODO something
});
```


	
## <i class="icon-tasks"></i> Usign Sync Promises

ilModelSyncPromise allows to syncronizate some data loading to call a callback after it's execution.

> <i class="icon-attention"></i> Use alwais `forEach` instead `for` in a list, because  `sync.add` returns an object you must store in local variable, one for each syncronization. If you are using `for` the variable always is the same and it won't work.

In this example, all purchases are loaded and for each one the user is loaded too. This example is the same than use Extend (in compatible data providers)

```javascript
Purchase.all().then(function(purchases){
	//Creation of synchronizer
	var sync=new ilModelPromiseSync();
	
	//For each purchase
	purchases.forEach(function(purchase){
		//Add a sync task
		var task=sync.add();
		
		//Force load of User
		purchase.$User.then(task);
	});
	
	//Add what happens when all finish
	sync.then(function(){
		//TODO when all users are loaded
	});	
});
```

TODO: addTask=function(startFunction,options)


A simplification. If you don't need to do anything when finish a task you can create task inside `then` of other promise.

```javascript
...
purchases.forEach(function(purchase){
	//Force load of User
	purchase.$User.then(sync.add());
});
...
```

###  <i class="icon-align-justify"></i> Multiple levels

New tasks can be added when you need. Also when other tasks has finished. But be sure add task before finish current one.

```javascript
myUser.$Purchases.then(function(purchases){
	//Creation of synchronizer
	var sync=new ilModelPromiseSync();
	
	//For each purchase
	purchases.forEach(function(purchase){
		//Add a sync task (level 1)
		var task=sync.add();
		
		//Force load of User
		purchase.$PurchaseProduct.then(function(purchaseProduct){
			//IMPORTANT: Don't do it inverted
			
			//First create a new task (level 2)
			var task2=sync.add();
			
			//Complete current task (level 1)
			task.ready();
	
			//Execute new task
			purchaseProduct.$Product.then(function(){
				
				//Complete task (level 2)
				task2.ready();
			});
			
		});
	});
	
	//Add what happens when all finish
	sync.then(function(){
		//TODO when all users are loaded
	});	
});
```

###  <i class="icon-spinner"></i> Checking the progress

It's possible to check the progres calling to ''sync.progress()''. It returns and object like that:

```json
{completed: 12, total: 34}
```

You can use on your HTML to show the progress:

```HTML
Progress: {{sync.progress().completed}} of {{sync.progress().total}}
```





## <i class="icon-cog-alt"></i> Models Declaration

See Quick start files at the end of this document

### General structure

```JS
ilModel.setup({
	name: "<name>", 

	//Fields
    fields: [
        new ilModelField("<name>", "<type>", <options>),
    ],

    //Associations
    associations: {
    
	    //Associated with multiple
        <name>: ilModelAssociation.multiple("Model associated", { <remote Id>:<local Id> }),
        
        //Associated with one
        <name>: ilModelAssociation.one("Model associated", { <local Id>:<remote Id> })
        
    },
    
	//Options
    options: {
    },

	//Data providers
    dataProviders: {
	    //Odata example
        odata: new ilModelDataProviderOData(),
    },

	//Synthetics fields (read only)
    synthetics: {
        <name of field>: function (object) {
            return <value>;
        }
	},
	
	//Object methods
	methods:{
		<name of method>:function(){
		}
	},

	//Static methods
	staticMethods:{
		<name of method>:function(){
		}
	},
	
	//Object postconstructor
	postConstructor : function (object) {
	    
	}
})

```

### Fields

```javascript
new ilModelField("<name>", "<type>", <options>)
```
   

#### Types

* guid
* bool
* int
* float
* string
* datetime

#### General modifiers

pk (true or false)
: It's primary key

readOnly (true or false)
: This field can no be modified

required (true or false)
: This field is required

noValidate (true or false)
: Force to no validate this field

auto (true or false)
: This field is initialitzated or modified by data provider

byDefault (any sinple type)
: Set a default value. When you create a new object and prepare sandbox, this value will be inserted into field

#### Strings modifiers

allowEmpty (bool)
: Allow empty strings

maxLen (int)
: Max string length


#### Predefined configurations

You can use these predefined configurations:

ilModelField.Configurations.ReadOnly
: { required: true, readOnly: true, auto: true }

ilModelField.Configurations.Pk
: { pk: true, required: true, readOnly: true, auto: true }

```javascript
new ilModelField("Id", "guid", ilModelField.Configurations.Pk)
```

#### Creating your own validator

```javascript
validateFnc:function(value,object){
	return true
}
```

In this example the field age is validated and only allows positive values:

```javascript
new ilModelField("age", "int",
	{
		required:true,
		validateFnc:function(value,object){
			return value>0;
		}
	}
)
```

	
#### Creating virtual fields	

A virtual field is a read/write field strong related with the real one, so that when real is modified virtual is modified too and vice versa.
	 
name
: Name of virtual field

toVirtual:function(value,object)
: Convert from real field value to virtual value/object

fromVirtual:function(value,object)
: Convert from virtual value/object to real field value

For instance, in this case `Date`  has a virtual `$Date` that is a [moment](http://momentjs.com) object

```javascript
new ilModelField("Date", "datetime",
	{
		required:true,
		virtual:{
			name:"$Date",
			toVirtual:function(value){
				return new moment(value); 
			},
			fromVirtual:function(value){ 
				return value.toISOString(); 
			} 
		}
	}
)
```

Virtual fields allows to access to virtual field instead of real value to show information in HTML o perform operations

```html
<p>{{myPurchase.$Date.format("LL")}}</p>
```

Also it can be modified and automatically modifies real field value. But remember only in sandbox. This example add 1 hour to current date

```javascript
myPurchase.$sandbox.$Date.add(1,"h");
``` 


### Associations

Two models can be related using associations. It allows an easy way to navigate and usign extends. 

For this example whe are using 

Customer
: Id is the primary key

Purchase
: Id is the primary key
CustomerFk is the foreign key to Customer

#### Unicity
For instance, a Purchase only has one Customer. In Purchase model:

```javascript
associations:{
	$Customer:ilModelAssociation.one(
		"Customer",//Name of related model
		{"CustomerFk":"Id"} //Pairs of local foreing key and related primary key
	) 
}
```

#### Multiplicity

For instance,  an Customer has multiple purchases. In Customer model:

```javascript
associations:{
	$Purchase:ilModelAssociation.multiple(
		"Purchase",//Name of related model
		{"Id":"CustomerFk"} //Pairs of local primary key and related foreign key
	) 
}
```

#### Multiplicity filtered

Its possible to filter a multiple association. For instance in this case we add an assocition to Customer to return completed purchases only

```javascript
associations:{
	$Purchase:ilModelAssociation.multiple(
		"Purchase",
		{"Id":"CustomerFk"},
		ilModelFieldQuery.Equals("Completed",true) //Only completed purchases
	) 
}
```


### Synthetic fields

Synthetic fields are read-only calculated fields. It can be used in multiple ways, for instance:

* To prepare a field to be printed on HTML. 
* Return an object search in array usign an identifier of model
* To access directly to associated data

In this case returns full name of Customer concatenating the last name and its name

```javascript
synthetics{
	FullName:function(object){
		return object.LastName +", "+object.Name;
	}
}
```


### Configurations

In each case if nothing is specified it will use ilModelConfiguration defaults

validateOnCreate
: Validate fields when object is created from data provider
by default is tru

validateOnCreateNew
: Validate fields when created a new object
by default is false

validateGenerateException
: If validation fails generate an exception
by default is true

defaultDataProvider
: Default data provider. If there are only one this is not necessary

forceReload
: Force reload in all calls (all, get and query) instead of usign cache
by default is false

useReplaceInsteadModify
: Force to data provider to use Replace (send all fields values) instead of Modify (send only modified fields values)
by default is false

### Object methods

It's possible extends the functionality of model adding methods to the created model objects. In the example,  a discount is apply to purchase

```javascript
methods:{
	totalPriceDiscount:function(){
		if (this.$Customer.data.isRecurrentCustomer)
			return this.TotalPrice*0.1; //If is a recurrent customer Discount of 10%
		else
			return this.TotalPrice*0.05; //Else discount of 5%
	}
}

...

var discount=myPurchase.totalPriceDiscount();
```

### Static methods

An static method is applied to Model. 

In this example function returns recurrent customers. Method of Customer

```javascript
staticMethods:{
	getRecurrentCustomers:function(list){
		var result=[];
		
		list.forEach(function(customer){
			if (customer.isRecurrentCustomer)
				result.push(customer);
		});
		
		return result;
	}
},

...
//Usage

Customer.all().then(function(customers){
	var recurrent=Customer.getRecurrentCustomers(customers);
});

```

### Post constructor

We can use a post-constructor function to prepare the object after load all it's fields and verification first time. For instant to prepare sandbox automatically

```javascript
postConstructor : function (object) {
	 object.prepareSandbox();   
}
```

## <i class="icon-book"></i> Collections 

A collection is a list of objects of a unique model.

TODO

###   Auto Filtered collections

TODO

###   Manual collection

TODO

##  <i class="icon-level-up"></i> Inicializations

### ilModelHttpAngular

ilModelConfiguration.setupDefaultAngularContext($http, $timeout);

TODO

##  <i class="icon-cloud"></i> Design data providers
TODO

## <i class="icon-cog-alt"></i> Global configuration
TODO

## <i class=" icon-megaphone"></i> The events emitter
TODO
