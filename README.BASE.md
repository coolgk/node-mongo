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

#### Inner Join with Constraints

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

#### Inner Join on Mulitple Collections

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

The model class must be initiated with a `Db` instance from mongo node client. e.g. the db variable in v3.x MongoClient.connect(url, (err, client) => { const db = client.db(dbName); ... }) or in v2.x MongoClient.connect(url, (err, db) => { ... })

```javascript
const { MongoClient } = require('mongodb');

MongoClient.connect('mongodb://localhost', (error, client) => {
    const model = new ModelA({
        db: client.db('test')
    });
});
```

OR

```javascript
const { MongoClient } = require('mongodb');

(async () => {
    const globalDb = await new Promise((resolve) => {
        MongoClient.connect('mongodb://localhost', async (error, client) => {
            const db = client.db('test');
            resolve(db);
        });
    });

    // ...
    // ...
    // ...

    const modela = new ModelA({ db: globalDb });
    const modelb = new ModelB({ db: globalDb });
    ...
})()
```

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

These Properties are valid for all data types.

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

##### **`required`**: a boolean value to define if this field is a manditory field

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

- "`model`": the class that the object id references to. This is a **required** property for `DataType.OBJECTID` type and is required by "`join`" option in `find()`

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

### Find & Join

Tested in MongoDB >= 3.x

An augmented version of the `find()` function from [mongo's native driver](#http://mongodb.github.io/node-mongodb-native/3.0/api/Collection.html#find)

#### `find(query, options)`

##### Parameters

- `query`: same as the `query` parameter in [mongo's node driver](#http://mongodb.github.io/node-mongodb-native/3.0/api/Collection.html#find)
- `options`: all options from [mongo's node driver](#http://mongodb.github.io/node-mongodb-native/3.0/api/Collection.html#find) plus two extra properties `cursor` and `join`

**`options.join`**

array of join definitions

```javascript
{
    join: [ // array of joins
        {
            on: ['name_of_an_object_id_field'],
            projection: { // optional
                [field_in_the_referenced_collection]: 1 or 0,
                ...
            },
            filters: { // optional
                // normal mongo query
            },
            join: { // optional
                on: ['name_of_an_object_id_field_from_the_referenced_collection'],
                ... // same format as the main join
            }
        },
        ...
    ]
}
```

- `join.on`: array of object id fields that reference to a same collection. There can be multiple joins in the `join` array but when there are multiple fields reference to a same collection, these fields could be defined in the same block e.g. `createdBy` and `modifiedBy` fields both reference to the `user` collection, the on value would be `['createdBy', 'modifiedBy']`. You can still put them in separate blocks if you need to filter them differently.
- `join.projection`: same as the `projection` option in `find()`. Fields to select from the referenced collection, 1 = select, 0 = deselect.
- `join.filters`: same as the `query` parameter in `find()` for filter docs in the referenced collection
- `join.join`: recursively join other collections

Example

```javascript
// model a schema
{
    a_name: {
        type: DataType.STRING
    },
    b_id: {
        type: DataType.OBJECTID,
        model: B
    },
    c_id: {
        type: DataType.OBJECTID,
        model: C
    }
}
// model b schema
{
    b_name: {
        type: DataType.STRING
    },
    c_id: {
        type: DataType.OBJECTID,
        model: C
    }
}
// model c schema
{
    c_name: {
        type: DataType.STRING
    },
    c_group: {
        type: DataType.STRING
    }
}

modelA.find({}, {
    join: [
        { // join a.b_id to b._id
            on: ['b_id'],
            join: [{ // join b.c_id to c._id
                on: 'c_id',
                filters: {
                    c_name: 'cname3'
                }
            }]
        },
        { // join a.c_id with c._id
            on: 'c_id',
            projection: {
                c_group: 1
            }
        }
    ]
});
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
            c_name: 'cname3',
            c_group: 'group3'
        }
    },
    c_id: {
        _id: '5a8bdfc1b07af22a12cb1f09',
        c_group: 'group2'
    }
}]
```

The query above is similar to SQL:

```sql
SELECT
    A.*, B.*, CB.*, CA.c_group
FROM
    A
JOIN
    B ON A.b_id = B._id
JOIN
    C as CB ON B.c_id = C._id
JOIN
    C as CA ON A.c_id = C._id
WHERE
    CB.c_name = 'cname3'
```

**`options.cursor`**

Boolean. The default value is `false`. By default, the results are returned as an array. If `cursor` is true, the items in cursor are promises instead documents. i.e. Promise<Document>

```javascript
const cursor = modelA.find({}, {
    join: {
        on: 'b_id'
    },
    cursor: true
});

cursor.forEach((documentPromise) => {
    documentPromise.then((document) => {
        ...
    });
});

// OR

cursor.forEach(async (documentPromise) => {
    const document = await documentPromise;
    ...
});
```


### Validation

require mongodb 3.6+

