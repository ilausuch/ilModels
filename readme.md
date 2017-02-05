# ilModels

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

## Extended reference & examples

[Documentation](https://stackedit.io/viewer#!provider=gist&gistId=c9019cf72e58bba7eb3f9e6c1cd845ad&filename=ilModels.gettingStarted.md)

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


