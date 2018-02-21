# @coolgk/mongo

A MongoDB ORM (ORM?) javascript / typescript library that enables data validation, joins on collections and simplifies CRUD on sub / nested documents in arrays.

`npm install @coolgk/mongo`

- [Feature Hightlights](#Feature-Hightlights)
- [Documentation](#Documentation)
  - [Basics](#Basics)
  - [Schema](#Schema)

## Feature Hightlights

### Join

SQL to @coolgk/mongo

#### Left Join

```sql
SELECT * FROM a LEFT JOIN b ON a.b_id = b.id
```

becomes

```javascript
model.find({}, {
    join: [ { on: 'b_id' } ]
})
```

Result:

```javascript
[{
    _id: '5a8bde4ae2ead929f89f3c42',
    a_name: 'aname1',
    b_id: {
        _id: '5a8bde4ae2ead929f89f3c41',
        b_name: 'bname1'
    }
}, { ... }, ... ]
```

#### Right Join with Constraints

```sql
SELECT * FROM a, b WHERE a.b_id = b.id AND b.b_name = 'bname1'
```

becomes

```javascript
model.find({}, {
    join: [ { on: 'b_id', filters: { b_name: 'bname1' } } ]
})
```

Result:

```javascript
[{
    _id: '5a8bdfb05d44ea2a08fa8a4c',
    a_name: 'aname2',
    b_id: {
        _id: '5a8bdfb05d44ea2a08fa8a4b',
        b_name: 'bname2'
    }
}]
```

#### Right Join on Mulitple Collections

```sql
SELECT * FROM a, b, c WHERE a.b_id = b.id AND b.c_id = c.id AND c.c_name = 'cname3'
```

```javascript
modela.find({}, {
    join: [{
        on: 'b_id',
        join: [{
            on: 'c_id',
            filters: { c_name: 'cname3' }
        }]
    }]
})
```

Result:

```javascript
[{
    _id: '5a8bdfc1b07af22a12cb1f0b',
    a_name: 'aname3',
    b_id: {
        _id: '5a8bdfc1b07af22a12cb1f0a',
        b_name: 'bname3',
        c_id: {
            _id: '5a8bdfc1b07af22a12cb1f09',
            c_name: 'cname3'
        }
    }
}]
```

### Data Validation

- Data Type Check
- Required Field
- Enum Values
- String Regex Pattern
- String Minimum and Maximum Length
- Minimum and Maximum Values For Numbers
- Minimum and Maximum Number of Array Items
- Unique Array Values

### Default Value, Setter Function, Last Modified Date

Schema:

```javascript
{
    name: {
        type: DataType.STRING,
        default: 'abc' // default value
    },
    category: {
        type: DataType.STRING,
        setter: (value, document) => { // setter callback
            document.tags = [value];
            return `cat: ${value}`;
        }
    },
    tags: {
        type: DataType.STRING,
        array: true
    }
}
```

```javascript
model.insertOne({ category: 'game' });
```

Result

```javascript
{
    _id: '5a8c097fb14dc72b8401c773',
    category: 'cat: game', // setter applied
    name: 'abc', // default value
    tags: ['game'], // added by cateegory's setter
    _dateModified: '2018-02-20T11:43:45.612Z' // automatically added by insertOne
}
```

### Sub Document CRUD

Updating documents in arrays could be annoying especially when there are 100+ or even 50+ of them in an array. This library makes it very easy to update documents in arrays.

Example Data

```javascript
const data = {
    title: 'Support Ticket 1',
    messages: [
        {
            user: 'customer',
            message: 'I found a bug'
        },
        {
            user: 'support',
            message: `Restart your computer`
        },
        {
            user: 'developer',
            message: `That's not a bug, it's a feature`
        }
    ]
}
```

#### Data Preparation: `_id` and `_dateModified`

This library automatically adds `_id` and `_dateMofidifed` values to each document in the array, and uses the generated `_id` values for CRUD operations.

```javascript
model.insertOne(data);
```

`data` becomes

```javascript
{
    _id: '5a8c16f3c452fd2c0d3687c6',
    _dateModified: '2018-02-20T12:39:15.258Z', // auto generated
    title: 'Support Ticket 1',
    messages: [{
            _id: '5a8c16f3c452fd2c0d3687c9', // auto generated
            user: 'customer',
            message: 'I found a bug',
            _dateModified: '2018-02-20T12:39:15.259Z' // auto generated
        },
        {
            _id: '5a8c16f3c452fd2c0d3687c8', // auto generated
            user: 'support',
            message: 'Restart your computer',
            _dateModified: '2018-02-20T12:39:15.259Z' // auto generated
        },
        {
            _id: '5a8c16f3c452fd2c0d3687c7', // auto generated
            user: 'developer',
            message: 'That\'s not a bug, it\'s a feature',
            _dateModified: '2018-02-20T12:39:15.259Z' // auto generated
        }
    ]
}
```

#### Update

Similar to InsertOne() but with `_id` values in data. The script below will update the value of the `"message"` field of the seconnd document in the `"messages"` array.

```javascript
model.updateOne({
    _id: '5a8c16f3c452fd2c0d3687c6', // find the document by _id in the collection
    messages: [
        {
            _id: '5a8c16f3c452fd2c0d3687c8', // find the document by _id in the array
            message: 'Turn on your computer' // update only the message field, other fields will not change
        }
    ]
});
```

data in the collection becomes

```javascript
{
    _id: '5a8c16f3c452fd2c0d3687c6',
    title: 'Support Ticket 1',
    messages: [{
            _id: '5a8c16f3c452fd2c0d3687c9',
            user: 'customer',
            message: 'I found a bug',
            _dateModified: '2018-02-20T12:39:15.259Z',
        },
        {
            _id: '5a8c16f3c452fd2c0d3687c8',
            user: 'support',
            message: 'Turn on your computer', // new value
            _dateModified: '2018-02-20T12:53:55.890Z' // new modified date
        },
        {
            _id: '5a8c16f3c452fd2c0d3687c7',
            user: 'developer',
            message: 'That\'s not a bug, it\'s a feature',
            _dateModified: '2018-02-20T12:39:15.259Z'
        }
    ],
    _dateModified: '2018-02-20T12:53:55.889Z' // new modified date
}
```

#### Delete

The script below will delete the seconnd document in the `"messages"` array.

```javascript
model.updateOne({
    _id: '5a8c16f3c452fd2c0d3687c6', // find the document by _id in the collection
    messages: {
        $delete: [ '5a8c16f3c452fd2c0d3687c8' ] // $delete operator: delete by _id
    }
});
```

data in the collection becomes

```javascript
{
    _id: '5a8c16f3c452fd2c0d3687c6',
    title: 'Support Ticket 1',
    messages: [{
            _id: '5a8c16f3c452fd2c0d3687c9',
            user: 'customer',
            message: 'I found a bug',
            _dateModified: '2018-02-20T12:39:15.259Z'
        },
        {
            _id: '5a8c16f3c452fd2c0d3687c7',
            user: 'developer',
            message: 'That\'s not a bug, it\'s a feature',
            _dateModified: '2018-02-20T12:39:15.259Z'
        }
    ],
    _dateModified: '2018-02-20T12:59:05.602Z' // new modified date
}
```

#### Replace or Delete All

```javascript
model.updateOne({
    _id: '5a8c16f3c452fd2c0d3687c6', // find the document by _id in the collection
    messages: {
        $replace: [] // replace the entire array with a new value
    }
});
```

#### Add

Similar to Update, but without `_id` in sub documents. The script below will add a new document into the `messages` array.

```javascript
model.updateOne({
    _id: '5a8c16f3c452fd2c0d3687c6', // find the document by _id in the collection
    messages: [
        { // documents without _id = insert new
            user: 'Support',
            message: 'Please Ctrl + F5'
        }
    ]
});
```

data in the collection becomes

```javascript
{
    _id: '5a8c16f3c452fd2c0d3687c6',
    title: 'Support Ticket 1',
    messages: [{
            _id: '5a8c16f3c452fd2c0d3687c9',
            user: 'customer',
            message: 'I found a bug',
            _dateModified: '2018-02-20T12:39:15.259Z'
        },
        {
            _id: '5a8c16f3c452fd2c0d3687c7',
            user: 'developer',
            message: 'That\'s not a bug, it\'s a feature',
            _dateModified: '2018-02-20T12:39:15.259Z'
        },
        { // new document
            _id: '5a8c1d6b082a652c35eb17d6', // auto generated
            user: 'Support',
            message: 'Please Ctrl + F5',
            _dateModified: '2018-02-20T13:06:51.244Z' // auto generated
        }
    ],
    _dateModified: '2018-02-20T13:06:51.243Z' // new modified date
}
```

#### Multiple Operations

Add, Update and Delete can happen in one single query.

```javascript
model.updateOne({
    _id: '5a8c16f3c452fd2c0d3687c6', // find the document by _id in the collection
    messages: {
        $update: [
            { // doc contains _id value, this is an update
                _id: '5a8c1d6b082a652c35eb17d6', // find the document by _id in the array
                message: 'Clear Your Cache' // update only the message field, other fields will not change
            },
            { // doc has no _id value, this is an insert
                user: 'developer',
                message: 'cannot replicate, not a bug!'
            }
        ],
        $delete: [ '5a8c16f3c452fd2c0d3687c9' ] // delete by _id (the first doc)
    }
});
```

Final Result

```javascript
{
    _id: '5a8c16f3c452fd2c0d3687c6',
    title: 'Support Ticket 1',
    messages: [{
            _id: '5a8c16f3c452fd2c0d3687c7'，
            user: 'developer',
            message: 'That\'s not a bug, it\'s a feature',
            _dateModified: '2018-02-20T12:39:15.259Z'
        },
        {
            _id: '5a8c1d6b082a652c35eb17d6'，
            user: 'Support',
            message: 'Clear Your Cache', // new value
            _dateModified: '2018-02-20T13:30:07.123Z' // new modified date
        },
        { // new doc
            _id: '5a8c22df4656722c3fd787fa'，// auto generated
            user: 'developer',
            message: 'cannot replicate, not a bug!',
            _dateModified: '2018-02-20T13:30:07.123Z' // auto generated
        }
    ],
    _dateModified: '2018-02-20T13:30:07.121Z' // new modified date
}
```

## Documentation

### Basics

#### Model Class

The model class must extend the `Mongo` property of this library and implement the `getCollectionName` and `getSchema` static methods.

- `getCollectionName` must return a collection name
- `getSchema` must return the schema of the collection (see the Schema section below)

```javascript
const { Mongo, DataType } = require('@coolgk/mongo');
// OR import { Mongo, DataType } from '@coolgk/mongo';

class ModelA extends Mongo {
    static getCollectionName () {
        return 'a';
    }
    static getSchema () {
        return {
            a_name: {
                type: DataType.STRING
            }
        }
    }
}
```

#### Class Instantiation



### Schema

Schema is defined in `static getSchema()` of the model class.

#### Schema Format

```javascript
{
    [fieldName]: {
        type: '...',
        ... // other properties
    },
    ...
}
```

#### Shared Schema Properties: `type`, `array`, `default`, `setter`, `required`

Properties that are valid for all data types.

##### **`type`**: Data type of the field. Supported types are in the DataType property of the library.

```javascript
const { DataType } = require('@coolgk/mongo');
```

- [DataType.STRING](#DataType.STRING)
- [DataType.NUMBER](#DataType.NUMBER)
- [DataType.ENUM](#DataType.ENUM)
- [DataType.OBJECTID](#DataType.OBJECTID)
- [DataType.DOCUMENT](#DataType.DOCUMENT)
- DataType.BOOLEAN
- DataType.DATE

##### **`array`**: a boolean value that defines if values are arrays

```javascript
const document = {
    tags: ['game', 'shooter', 'sale']; // array of strings
};

const schema = {
    tags: {
        type: DataType.STRING, // string type
        array: true // array of string
    }
}
```

##### **`default`**: defines the default value of a field

```javascript
const schema = {
    group: {
        type: DataType.STRING, // string type
        default: 'generic'
    }
}
```

##### **`setter`**: a callback function that transforms the value before insert and update

`(value, document) => { return newValue; }`

- value: original value
- document: all new values (to be saved) in the same document
- return: a new value

```javascript
const schema = {
    tags: {
        type: DataType.STRING, // string type
        setter: (value, document) => {
            return value + '-tag'
        }
    }
}
```

##### **`required`**: manditory field, a boolean value for validation

```javascript
const schema = {
    email: {
        type: DataType.STRING, // string type
        required: true
    }
}
```

##### `default`, `setter`, `array`, `required` Example

```javascript
const schema = {
    name: {
        type: DataType.STRING,
        default: 'abc' // default value
    },
    category: {
        type: DataType.STRING,
        required: true, // manditory field
        setter: (value, document) => { // setter callback
            document.tags = [value];
            return `cat: ${value}`;
        }
    },
    tags: {
        type: DataType.STRING,
        array: true
    }
}
```

```javascript
model.insertOne({ category: 'game' });
```

Result

```javascript
{
    _id: '5a8c097fb14dc72b8401c773',
    category: 'cat: game', // setter applied
    name: 'abc', // default value
    tags: ['game'], // added by cateegory's setter
    _dateModified: '2018-02-20T11:43:45.612Z' // automatically added by insertOne
}
```

#### Shared Array Validation Properties: `maxItems`, `minItems`, `uniqueItems`

for fields that have `array: true`

- "`maxItems`": the maximum number of items in array
- "`minItems`": the minimum number of items in array
- "`uniqueItems`": a boolean value to define if each item in the array must be unique

```javascript
{
    secureQuestionAnswers: {
        type: DataType.STRING,
        array: true,
        minItems: 1,
        maxItems: 3,
        uniqueItems: true
    }
}
```

#### Type Specific Properties

##### `DataType.ENUM`

- "`enum`": array of enum values

```javascript
{
    logLevel: {
        type: DataType.ENUM,
        enum: [ 'notice', 'warn', 'error' ]
    }
}
```

##### `DataType.STRING`

- "`minLength`": minimum length of the string value
- "`maxLength`": maximum length of the string value
- "`pattern`": string containing a regex, the string value must match the regular expression

```javascript
{
    email: {
        type: DataType.STRING,
        minLength: 10,
        maxLength: 200,
        pattern: '@\w+\.com$'
    }
}
```

##### `DataType.NUMBER`

- "`minimum`": minimum value of a number
- "`maximum`": minimum value of a number

```javascript
{
    rating: {
        type: DataType.NUMBER,
        minimum: 0,
        maximum: 10
    }
}
```

##### `DataType.OBJECTID`

- "`model`": the class that the object id value references to. This is a **required** property for `DataType.OBJECTID` type and is required by "`join`" option in `find()`

```javascript
const { Mongo, DataType } = require('@coolgk/mongo');

class Category extends Mongo {
    static getCollectionName () {
        return 'Category';
    }
    static getSchema () {
        return {
            name: {
                type: DataType.STRING
            }
        }
    }
}

class Product extends Mongo {
    static getCollectionName () {
        return 'Product';
    }
    static getSchema () {
        return {
            name: {
                type: DataType.STRING
            },
            category: {
                type: DataType.OBJECTID,
                model: Category // category class, in real code, this could be require(../models/category.js)
            }
        }
    }
}
```

##### `DataType.DOCUMENT`

- "`schema`": the schema of the sub document which uses the same format as the main schema

```javascript
{
    address: {
        type: DataType.DOCUMENT,
        schema: { // schema of the address sub document
            street: {
                type: DataType.STRING
            },
            postcode: {
                type: DataType.STRING
            },
            country: {
                type: DataType.OBJECTID,
                model: Country
            }
        }
    }
}
```


Report bugs here: [https://github.com/coolgk/mongo/issues](https://github.com/coolgk/mongo/issues)

## Classes

<dl>
<dt><a href="#MongoError">MongoError</a> ⇐ <code>Error</code></dt>
<dd></dd>
<dt><a href="#SchemaError">SchemaError</a> ⇐ <code>Error</code></dt>
<dd></dd>
<dt><a href="#Mongo">Mongo</a></dt>
<dd></dd>
</dl>

<a name="MongoError"></a>

## MongoError ⇐ <code>Error</code>
**Kind**: global class  
**Extends**: <code>Error</code>  
**Export**:   
<a name="new_MongoError_new"></a>

### new MongoError()
One of the Error types thrown from this module

<a name="SchemaError"></a>

## SchemaError ⇐ <code>Error</code>
**Kind**: global class  
**Extends**: <code>Error</code>  
**Export**:   
<a name="new_SchemaError_new"></a>

### new SchemaError()
One of the Error types thrown from this module

<a name="Mongo"></a>

## Mongo
**Kind**: global class  
**Export**:   

* [Mongo](#Mongo)
    * _instance_
        * [.getObjectID(id)](#Mongo+getObjectID) ⇒ <code>object</code> \| <code>undefined</code>
        * [.getObjectId()](#Mongo+getObjectId)
        * [.getDb()](#Mongo+getDb) ⇒ <code>object</code>
        * [.getCollection()](#Mongo+getCollection) ⇒ <code>object</code>
        * [.setDbValidationSchema()](#Mongo+setDbValidationSchema) ⇒ <code>Promise.&lt;\*&gt;</code>
        * [.insertOne(data, options)](#Mongo+insertOne) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.insertMany(data, options)](#Mongo+insertMany) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.updateOne(data, [options])](#Mongo+updateOne) ⇒ <code>Promise.&lt;object&gt;</code>
        * [.find(query, [options])](#Mongo+find) ⇒ <code>Promise.&lt;(Cursor\|Array.&lt;object&gt;)&gt;</code>
        * [.attachObjectIdData(data, joins)](#Mongo+attachObjectIdData) ⇒ <code>Promise.&lt;(Cursor\|Array.&lt;object&gt;)&gt;</code>
    * _static_
        * [.Mongo](#Mongo.Mongo)
            * [new Mongo(options)](#new_Mongo.Mongo_new)
        * [.getCollectionName()](#Mongo.getCollectionName) ⇒ <code>string</code>
        * [.getSchema()](#Mongo.getSchema) ⇒ <code>object</code>

<a name="Mongo+getObjectID"></a>

### mongo.getObjectID(id) ⇒ <code>object</code> \| <code>undefined</code>
**Kind**: instance method of [<code>Mongo</code>](#Mongo)  
**Returns**: <code>object</code> \| <code>undefined</code> - - an ObjectID or undefined if "id" is not a valid ObjectID string  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>object</code> \| <code>string</code> | a string or an instance of ObjectID |

<a name="Mongo+getObjectId"></a>

### mongo.getObjectId()
an alias of the getObjectID() method.

**Kind**: instance method of [<code>Mongo</code>](#Mongo)  
<a name="Mongo+getDb"></a>

### mongo.getDb() ⇒ <code>object</code>
**Kind**: instance method of [<code>Mongo</code>](#Mongo)  
**Returns**: <code>object</code> - - returns the db instance passed into the constructor  
<a name="Mongo+getCollection"></a>

### mongo.getCollection() ⇒ <code>object</code>
**Kind**: instance method of [<code>Mongo</code>](#Mongo)  
**Returns**: <code>object</code> - - mongo Collection insance of the current model  
<a name="Mongo+setDbValidationSchema"></a>

### mongo.setDbValidationSchema() ⇒ <code>Promise.&lt;\*&gt;</code>
set validation schema in mongo

**Kind**: instance method of [<code>Mongo</code>](#Mongo)  
**Returns**: <code>Promise.&lt;\*&gt;</code> - - a promise returned from mongo's createCollection or collMod commands  
<a name="Mongo+insertOne"></a>

### mongo.insertOne(data, options) ⇒ <code>Promise.&lt;object&gt;</code>
Insert One Document

**Kind**: instance method of [<code>Mongo</code>](#Mongo)  
**Returns**: <code>Promise.&lt;object&gt;</code> - - returns the return value of mongo's insertOne() function  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>object</code> | one document |
| options | <code>object</code> | options of mongo's insertOne() function |

<a name="Mongo+insertMany"></a>

### mongo.insertMany(data, options) ⇒ <code>Promise.&lt;object&gt;</code>
Insert Mulitple Documents

**Kind**: instance method of [<code>Mongo</code>](#Mongo)  
**Returns**: <code>Promise.&lt;object&gt;</code> - - returns the return value of mongo's insertMany()  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Array.&lt;object&gt;</code> | multiple documents |
| options | <code>object</code> | options of mongo's insertMany() function |

<a name="Mongo+updateOne"></a>

### mongo.updateOne(data, [options]) ⇒ <code>Promise.&lt;object&gt;</code>
Update a single document.
updateOne() updates data in three steps: set, add, delete.
This method is not atomic if more than one type of actions are executed e.g. set+add set+delete or set+add+delete etc.
updateOne() is atomic if only one type of actions is executed e.g. only adding new values

**Kind**: instance method of [<code>Mongo</code>](#Mongo)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| data | <code>object</code> |  | one document, must contains a _id field |
| [options] | <code>object</code> | <code>{}</code> | options of mongo's findOneAndUpdate() function plus the one(s) below |
| [options.revertOnError] | <code>boolean</code> | <code>false</code> | restore db values back to the original values before the update. This action is NOT atomic. If an error happens in the set, add, delete processes, the data is stored as at where the action stopped. e.g. if an error happens in the delete step, data set and added in the previous steps are stored in db. To stop this from happening, the "revertOnerror" option reverts the document back to the status before the updateOne() is executed. This action is not atomic. If the document is updated by a different source while updateOne() is still processing data , the "revertOnError" option will overwrite the changes made from by the other source. |

<a name="Mongo+find"></a>

### mongo.find(query, [options]) ⇒ <code>Promise.&lt;(Cursor\|Array.&lt;object&gt;)&gt;</code>
see parameter description for query and options in http://mongodb.github.io/node-mongodb-native/3.0/api/Collection.html#find

**Kind**: instance method of [<code>Mongo</code>](#Mongo)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| query | <code>object</code> |  | same as query in mongo collection.find() |
| [options] | <code>object</code> | <code>{}</code> | all value in options for mongo collection.find() |
| [options.join] | <code>object</code> |  | query for joining other collections. format: { on: string | string[], projection?: { [fieldname]: 1 | 0 }, filters?: {...}, join?: { on: ..., projection?: ..., filters?: ..., join?: ... }[] } |
| [options.cursor] | <code>object</code> | <code>false</code> | if to return a cursor, by default an array is returned |

<a name="Mongo+attachObjectIdData"></a>

### mongo.attachObjectIdData(data, joins) ⇒ <code>Promise.&lt;(Cursor\|Array.&lt;object&gt;)&gt;</code>
Attach referenced collection data to a query result. Note: filters in join are not supported if this method is used directly on a query result i.e. not called from find(). Use find() if you want to filter result by the data in referenced collections

**Kind**: instance method of [<code>Mongo</code>](#Mongo)  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Cursor</code> \| <code>Array.&lt;object&gt;</code> | a mongo query result |
| joins | <code>Array.&lt;object&gt;</code> | query for joining other collections. format: { on: string | string[], projection?: { [fieldname]: 1 | 0 }, join?: { on: ..., projection?: ..., join?: ... }[] } |

<a name="Mongo.Mongo"></a>

### Mongo.Mongo
**Kind**: static class of [<code>Mongo</code>](#Mongo)  
<a name="new_Mongo.Mongo_new"></a>

#### new Mongo(options)

| Param | Type | Description |
| --- | --- | --- |
| options | <code>object</code> |  |
| options.db | <code>object</code> | a Db instance from mongo node client e.g. the db variable in v3.x MongoClient.connect(url, (err, client) => { const db = client.db(dbName); ... }) v2.x MongoClient.connect(url, (err, db) => { ... }) |

<a name="Mongo.getCollectionName"></a>

### Mongo.getCollectionName() ⇒ <code>string</code>
classes that extends this class must implement this static method to set the collection name of the model

**Kind**: static method of [<code>Mongo</code>](#Mongo)  
**Returns**: <code>string</code> - - the collection name of the model  
<a name="Mongo.getSchema"></a>

### Mongo.getSchema() ⇒ <code>object</code>
classes that extends this class must implement this static method to set the schema of the model

**Kind**: static method of [<code>Mongo</code>](#Mongo)  
**Returns**: <code>object</code> - - model schema, see documentaion.  
