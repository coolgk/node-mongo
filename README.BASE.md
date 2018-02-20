# @coolgk/mongo

`npm install @coolgk/mongo`

A MongoDB ORM (ORM?) library that enables data validation, joins on collections and simplifies CRUD on sub / nested documents in arrays.

## Feature Hightlights

### Join: SQL to @coolgk/mongo

#### Left Join

```sql
SELECT * FROM a LEFT JOIN b ON a.b_id = b.id
```

```javascript
model.find({}, {
    join: [ { on: 'b_id' } ]
})`
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

- Data Type
- Required Field
- Enum Values
- String Pattern
- String Minimum and Maximum Length
- Minimum and Maximum Values
- Minium and Maximum Number of Array Items
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
        setter: (value, row) => { // setter callback
            row.tags = [value];
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

```javascript
{
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