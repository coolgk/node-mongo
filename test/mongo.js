'use strict';

// const sinon = require('sinon');
const chai = require('chai');
chai.use(require('chai-as-promised'));
const expect = chai.expect;

describe.only('Mongo Module', function () {
    this.timeout(30000);

    const { Mongo, DataType, GeneratedField } = require(`../dist/mongo`);
    const { MongoClient, ObjectID, writeError } = require('mongodb');

    let model;
    let db;
    let mongoClient;
    let model1Documents;
    let model2Documents;
    let model3Documents;
    let model4Documents;
    let Model1;
    let Model2;
    let Model3;
    let Model4;
    const model1Name = 'model1';
    const model2Name = 'model2';
    const model3Name = 'model3';
    const model4Name = 'model4';

    before((done) => {

        class M1 extends Mongo {
            static getSchema () {
                return {
                    string: {
                        type: DataType.STRING,
                        default: 'xyz',
                        setter: (value) => {
                            return value + '-setter';
                        }
                    },
                    number: {
                        type: DataType.NUMBER
                    },
                    boolean: {
                        type: DataType.BOOLEAN
                    },
                    date: {
                        type: DataType.DATE
                    },
                    model2DbRef: {
                        type: DataType.OBJECTID,
                        model: Model2
                    },
                    enum: {
                        type: DataType.ENUM,
                        enum: ['abc', 'xyz']
                    },
                    object: {
                        type: DataType.DOCUMENT,
                        schema: {
                            string: {
                                type: DataType.STRING
                            },
                            number: {
                                type: DataType.NUMBER
                            }
                        }
                    },
                    stringArray: {
                        type: DataType.STRING,
                        array: true
                    },
                    objectArray: {
                        type: DataType.DOCUMENT,
                        array: true,
                        schema: {
                            date: {
                                type: DataType.DATE
                            },
                            model3DbRef: {
                                type: DataType.OBJECTID,
                                model: Model3
                            }
                        }
                    }
                };
            }
            static getCollectionName () {
                return model1Name;
            }
        }
        Model1 = M1;

        class M2 extends Mongo {
            static getSchema () {
                return {
                    model3Ref: {
                        type: DataType.OBJECTID,
                        model: Model3
                    },
                    string: {
                        type: DataType.STRING
                    },
                    number: {
                        type: DataType.NUMBER
                    },
                    model4Ref: {
                        type: DataType.OBJECTID,
                        model: Model4
                    }
                };
            }
            static getCollectionName () {
                return model2Name;
            }
        }
        Model2 = M2;

        class M3 extends Mongo {
            static getSchema () {
                return {
                    enum: {
                        type: DataType.ENUM,
                        array: true,
                        enum: ['aaa', 222, false]
                    },
                    boolean: {
                        type: DataType.BOOLEAN
                    }
                };
            }
            static getCollectionName () {
                return model3Name;
            }
        }
        Model3 = M3;

        class M4 extends Mongo {
            static getSchema () {
                return {
                    m4str: DataType.STRING
                };
            }
            static getCollectionName () {
                return model4Name;
            }
        }
        Model4 = M4;

        model4Documents = [
            {
                _id: new ObjectID(),
                m4str: 's1'
            },
            {
                _id: new ObjectID(),
                m4str: 's1'
            },
            {
                _id: new ObjectID(),
                m4str: 's2'
            }
        ];

        model3Documents = [
            {
                _id: new ObjectID(),
                enum: ['aaa'],
                boolean: true
            },
            {
                _id: new ObjectID(),
                enum: [false, 222],
                boolean: true
            },
            {
                _id: new ObjectID(),
                enum: [false],
                boolean: false
            }
        ];

        model2Documents = [
            {
                _id: new ObjectID(),
                string: 'm2111111',
                number: 1234,
                model3Ref: model3Documents[1]._id,
                model4Ref: model4Documents[1]._id
            },
            {
                _id: new ObjectID(),
                string: 'm2222222',
                number: 2345,
                model3Ref: model3Documents[2]._id,
                model4Ref: model4Documents[2]._id
            },
            {
                _id: new ObjectID(),
                string: 'm2333333',
                number: 3456,
                model3Ref: model3Documents[0]._id,
                model4Ref: model4Documents[0]._id
            }
        ];

        model1Documents = [
            {
                _id: new ObjectID(),
                string: 'string value',
                number: 11,
                boolean: true,
                date: new Date('2018-02-03'),
                model2DbRef: model2Documents[1]._id,
                enum: 'abc',
                object: {
                    string: 'abc',
                    number: 1111
                },
                stringArray: ['aaa', 'bbb', 'ccc'],
                objectArray: [
                    {
                        date: new Date('2018-02-02'),
                        model3DbRef: model3Documents[2]._id
                    },
                    {
                        date: new Date('2018-02-01'),
                        model3DbRef: model3Documents[1]._id
                    }
                ]
            },
            {
                _id: new ObjectID(),
                string: 'string1111',
                number: 12,
                boolean: false,
                date: new Date('2018-02-01'),
                model2DbRef: model2Documents[0]._id,
                enum: 'd22222',
                object: {
                    string: 't2222',
                    number: 2222
                },
                stringArray: ['eee', 'ddd'],
                objectArray: [
                    {
                        date: new Date('2018-01-02'),
                        model3DbRef: model3Documents[0]._id
                    },
                    {
                        date: new Date('2018-01-31'),
                        model3DbRef: model3Documents[2]._id
                    }
                ]
            },
            {
                _id: new ObjectID(),
                string: 'string3333',
                number: 13,
                boolean: false,
                date: new Date('2018-01-21'),
                model2DbRef: model2Documents[2]._id,
                enum: 'd333',
                object: {
                    string: 't333',
                    number: 333
                },
                stringArray: ['ddd'],
                objectArray: []
            },
            {
                _id: new ObjectID(),
                string: 'string444',
                number: 14,
                boolean: true,
                date: new Date('2018-01-08'),
                model2DbRef: model2Documents[1]._id,
                enum: 'd443',
                object: {
                    string: 't444',
                    number: 4444
                },
                stringArray: [],
                objectArray: [
                    {
                        date: new Date('2018-01-19'),
                        model3DbRef: model3Documents[0]._id
                    }
                ]
            }
        ];

        MongoClient.connect(process.env.MONGO_URL, async (error, client) => {
            if (error) {
                return done(error);
            }

            db = client.db(process.env.MONGO_DB_NAME);

            const collection1 = db.collection(
                Model1.getCollectionName()
            );
            const collection2 = db.collection(
                Model2.getCollectionName()
            );
            const collection3 = db.collection(
                Model3.getCollectionName()
            );
            const collection4 = db.collection(
                Model4.getCollectionName()
            );

            await new Promise((resolve) => {
                collection4.insertMany(model4Documents, (error, result) => resolve(result));
            });

            await new Promise((resolve) => {
                collection3.insertMany(model3Documents, (error, result) => resolve(result));
            });

            await new Promise((resolve) => {
                collection2.insertMany(model2Documents, (error, result) => resolve(result));
            });

            await new Promise((resolve) => {
                collection1.insertMany(model1Documents, (error, result) => resolve(result));
            });

            mongoClient = client;
            done();
        });

    });

    beforeEach(() => {
        model = new Model1({ db });
    });

    after(async () => {
        await db.dropDatabase();
        await mongoClient.close(true);
    });

    describe('native mongo operations', () => {

        it('should find all', async () => {
            const result = await model.find();
            expect(await result).to.deep.equal(model1Documents);
        });

        it('should do basic filtering', async () => {
            const result = await model.find({
                number: 11
            });
            expect(result).to.deep.equal(model1Documents.filter((row) => row.number === 11));
        });

        it('should select and deselect fields', async () => {
            const result = await model.find(
                {
                    _id: model1Documents[0]._id
                },
                {
                    projection: {
                        enum: 1,
                        string: 1
                    }
                }
            );
            expect(result).to.deep.equal(
                model1Documents
                    .filter((row) => row._id.toHexString() === model1Documents[0]._id.toHexString())
                    .map((row) => ({ _id: row._id, enum: row.enum, string: row.string }))
            );

            const result2 = await model.find({}, {
                projection: {
                    object: 0,
                    stringArray: 0,
                    objectArray: 0
                }
            });
            expect(result2).to.deep.equal(
                model1Documents
                    .map((row) => {
                        row = Object.assign({}, row);
                        delete row.object;
                        delete row.stringArray;
                        delete row.objectArray;
                        return row;
                    })
            );
        });

    });

    describe('find', () => {

        it('should filter ObjectIds by string', async () => {
            const result = await model.find({
                _id: model1Documents[0]._id.toHexString()
            });
            expect(result).to.deep.equal([model1Documents[0]]);
        });

        it('should select object id fields', async () => {
            const result = await model.find({}, {
                join: [{
                    on: 'model2DbRef',
                    projection: {
                        string: 1,
                        model3Ref: 1
                    }
                }]
            });
            const documents = model1Documents.map((row) => {
                return Object.assign({}, row, {
                    model2DbRef: model2Documents.filter((model2Row) => {
                        return model2Row._id.toHexString() === row.model2DbRef.toHexString();
                    }).map((row) => ({ _id: row._id, string: row.string, model3Ref: row.model3Ref })).pop()
                });
            });

            expect(result).to.deep.equal(documents);
        });

        it('should recursively select object id fields', async () => {
            const result = await model.find({}, {
                join: [
                    {
                        on: ['model2DbRef'],
                        projection: {
                            string: 1,
                            model3Ref: 1
                        },
                        join: [{
                            on: 'model3Ref',
                            projection: {
                                enum: 1
                            }
                        }]
                    }
                ]
            });

            const documents = model1Documents.map((row) => {
                return Object.assign({}, row, {
                    model2DbRef: model2Documents.filter((model2Row) => {
                        return model2Row._id.toHexString() === row.model2DbRef.toHexString();
                    }).map((row) => ({
                        _id: row._id,
                        string: row.string,
                        model3Ref: model3Documents.filter((model3Row) => {
                            return model3Row._id.toHexString() === row.model3Ref.toHexString();
                        }).map((row) => ({ _id: row._id, enum: row.enum })).pop()
                    })).pop()
                });
            });

            expect(result).to.deep.equal(documents);

            // join array
            const result2 = await model.find({}, {
                join: [
                    {
                        on: ['model2DbRef'],
                        projection: {
                            string: 1,
                            model3Ref: 1
                        },
                        join: [{
                            on: 'model3Ref',
                            projection: {
                                enum: 1
                            }
                        }]
                    },
                    {
                        on: 'objectArray.model3DbRef',
                        projection: {
                            enum: 1
                        }
                    }
                ]
            });

            const documents2 = model1Documents.map((row) => {
                return Object.assign({}, row, {
                    model2DbRef: model2Documents.filter((model2Row) => {
                        return model2Row._id.toHexString() === row.model2DbRef.toHexString();
                    }).map((row) => ({
                        _id: row._id,
                        string: row.string,
                        model3Ref: model3Documents.filter((model3Row) => {
                            return model3Row._id.toHexString() === row.model3Ref.toHexString();
                        }).map((row) => ({ _id: row._id, enum: row.enum })).pop()
                    })).pop(),
                    objectArray: row.objectArray.map((item) => {
                        return Object.assign({}, item, {
                            model3DbRef: model3Documents.filter((model3Row) => {
                                return model3Row._id.toHexString() === item.model3DbRef.toHexString();
                            }).map((row) => ({ _id: row._id, enum: row.enum })).pop()
                        });
                    })
                });
            });

            expect(result2).to.deep.equal(documents2);
        });

        it('should be able to query other collection', async () => {
            const result = await model.getDb().collection(model2Name).find().toArray();
            expect(result).to.deep.equal(model2Documents);
        });

        it('should attach object id to cursor', async () => {
            const result = await model.find({}, {
                join: [
                    {
                        on: 'model2DbRef',
                        projection: {
                            string: 1,
                            model3Ref: 1
                        }
                    }
                ],
                cursor: 1
            });

            return new Promise((resolve, reject) => {
                const promises = [];
                result.forEach(
                    (row) => {
                        promises.push(
                            row.then((item) => {
                                expect(item.model2DbRef).to.deep.equal(
                                    model2Documents.filter((model2Row) => {
                                        return model2Row._id.toHexString() === item.model2DbRef._id.toHexString();
                                    }).map((row) => ({ _id: row._id, string: row.string, model3Ref: row.model3Ref })).pop()
                                );
                            })
                        );
                    },
                    () => resolve(Promise.all(promises))
                );
            });
        });

        it('should filter object id referenced fields', async () => {
            const result = await model.find({}, {
                join: [{
                    on: ['model2DbRef'],
                    projection: {
                        string: 1,
                        model3Ref: 1
                    },
                    filters: {
                        number: 2345
                    }
                }]
            });

            const model2Data = model2Documents.filter((m2row) => {
                return m2row.number === 2345;
            });

            const docs = model1Documents.map((row) => {
                return Object.assign({}, row);
            }).filter((row) => {
                const m2row = model2Data.find((m2row) => {
                    return m2row._id.toHexString() === row.model2DbRef.toHexString();
                });
                if (m2row) {
                    row.model2DbRef = { _id: m2row._id, string: m2row.string, model3Ref: m2row.model3Ref };
                    return true;
                }
                return false;
            });

            expect(result).to.deep.equal(docs);
        });

        it('should filter resursive object id referenced fields when there are multiple matches', async () => {
            const result = await model.find({}, {
                join: [
                    {
                        on: 'model2DbRef',
                        projection: {
                            model3Ref: 1
                        },
                        join: [
                            {
                                on: 'model3Ref'
                            },
                            {
                                on: 'model4Ref',
                                filters: {
                                    m4str: 's1'
                                }
                            }
                        ]
                    }
                ]
            });

            const model4Data = model4Documents.filter((row) => {
                return row.m4str === 's1';
            });

            const model2Data = model2Documents
                .map((row) => Object.assign({}, row))
                .filter((m2row) => {
                    m2row.model3Ref = model3Documents.find((m3row) => {
                        return m3row._id.toHexString() === m2row.model3Ref.toHexString();
                    });
                    m2row.model4Ref = model4Data.find((m4row) => {
                        return m4row._id.toHexString() === m2row.model4Ref.toHexString();
                    });
                    return m2row.model4Ref;
                }).map((m2row) => {
                    return {
                        _id: m2row._id,
                        model3Ref: m2row.model3Ref
                    };
                });

            const docs = model1Documents
                .map((row) => {
                    return Object.assign({}, row);
                }).filter((m1row) => {
                    const m2row = model2Data.find((m2row) => {
                        return m2row._id.toHexString() === m1row.model2DbRef.toHexString();
                    });
                    if (m2row) {
                        m1row.model2DbRef = m2row;
                        return true;
                    }
                    return false;
                });

            expect(result).to.deep.equal(docs);
        });

        it('should filter object id references in array', async () => {
            const result = await model.find({}, {
                join: [
                    {
                        on: 'model2DbRef',
                        projection: {
                            model3Ref: 1
                        }
                    },
                    {
                        on: 'objectArray.model3DbRef',
                        filters: {
                            boolean: false
                        }
                    }
                ]
            });

            const model3Data = model3Documents.filter((row) => {
                return row.boolean === false;
            });

            const model2Data = model2Documents.map((m2row) => {
                return {
                    _id: m2row._id,
                    model3Ref: m2row.model3Ref
                };
            });

            const docs = model1Documents.map((row) => Object.assign({}, row)).filter((m1row) => {
                m1row.model2DbRef = model2Data.find((m2row) => {
                    return m2row._id.toHexString() === m1row.model2DbRef.toHexString();
                });

                let found = false;
                m1row.objectArray = m1row.objectArray.map((item) => {
                    const refData = model3Data.find((m3row) => {
                        return item.model3DbRef.toHexString() === m3row._id.toHexString();
                    });

                    if (refData) {
                        found = true;
                        // item.model3DbRef = model3Data.find((m3row) => {
                        //     return item.model3DbRef.toHexString() === m3row._id.toHexString();
                        // });
                        return Object.assign({}, item, {
                            model3DbRef: refData
                        });
                    }

                    // item.model3DbRef = { _id: item.model3DbRef };
                    return Object.assign({}, item, {
                        model3DbRef: { _id: item.model3DbRef }
                    });
                });

                return found;
            });

            expect(result).to.deep.equal(docs);
        });

        it('should attach object id data when foreign collections projection is not defined', async () => {
            const result = await model.find({}, {
                join: [
                    {
                        on: 'model2DbRef'
                    }
                ]
            });

            const docs = model1Documents.map((m1row) => {
                return Object.assign({}, m1row, {
                    model2DbRef: model2Documents.find((m2row) => {
                        return m2row._id.toHexString() === m1row.model2DbRef.toHexString();
                    })
                });
            });

            expect(result).to.deep.equal(docs);
        });

        it('should filter object id reference and join another object id in reference without filters', async () => {
            const result = await model.find({}, {
                join: [
                    {
                        on: ['model2DbRef'],
                        filters: {
                            number: {
                                $gt: 1234
                            }
                        },
                        join: [
                            {
                                on: 'model3Ref'
                            }
                        ]
                    }
                ]
            });

            const model2Data = model2Documents.filter((m2row) => {
                return m2row.number > 1234;
            }).map((m2row) => {
                return Object.assign({}, m2row, {
                    model3Ref: model3Documents.find((m3row) => {
                        return m2row.model3Ref.toHexString() === m3row._id.toHexString();
                    })
                });
            });

            const docs = model1Documents.map((row) => Object.assign({}, row)).filter((m1row) => {
                return m1row.model2DbRef = model2Data.find((m2row) => {
                    return m2row._id.toHexString() === m1row.model2DbRef.toHexString();
                });
            });

            expect(result).to.deep.equal(docs);
        });

        // it('should not cause object id infinite loops');
        // it('should call getter functions?');
    });

    describe('save & update', () => {

        class M5 extends Mongo {
            static getSchema () {
                return {
                    stringArray: {
                        type: DataType.STRING,
                        array: true,
                        maxItems: 2,
                        maxLength: 10,
                        minLength: 2
                    },
                    enumArray: {
                        type: DataType.ENUM,
                        array: true,
                        enum: ['a', 'b', 1],
                        minItems: 2,
                        uniqueItems: true
                    },
                    docArray: {
                        type: DataType.DOCUMENT,
                        array: true,
                        default: [{
                            enum: 5
                        }],
                        schema: {
                            string: {
                                type: DataType.STRING,
                                pattern: '^abc.+'
                            },
                            enum: {
                                type: DataType.ENUM,
                                enum: [3, 4, 5],
                                required: true
                            },
                            docInArray: {
                                type: DataType.DOCUMENT,
                                default: {
                                    number: 8
                                },
                                schema: {
                                    number: {
                                        type: DataType.NUMBER,
                                        maximum: 10,
                                        required: true
                                    },
                                    nestedDoc: {
                                        type: DataType.DOCUMENT,
                                        default: [{
                                            string: 'default'
                                        }],
                                        array: true,
                                        schema: {
                                            string: {
                                                type: DataType.STRING
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    number: {
                        type: DataType.NUMBER,
                        minimum: 10,
                        default: 12
                    },
                    boolean: {
                        type: DataType.BOOLEAN,
                        required: true
                    },
                    date: {
                        type: DataType.DATE,
                        required: true
                    },
                    objectid: {
                        type: DataType.OBJECTID
                    },
                    doc: {
                        type: DataType.DOCUMENT,
                        schema: {
                            boolean: {
                                type: DataType.BOOLEAN
                            }
                        }
                    },
                    string: {
                        type: DataType.STRING,
                        default: 'ddd'
                    },
                    enum: {
                        type: DataType.ENUM,
                        enum: ['x']
                    },
                    dateDefault: {
                        type: DataType.DATE,
                        default: new Date('2018-02-17')
                    },
                    setterString: {
                        type: DataType.STRING,
                        setter: (value) => value + 'aaa'
                    },
                    promiseSetterString: {
                        type: DataType.STRING,
                        setter: (value) => Promise.resolve(value + 'aaa')
                    },
                    setterDefaultString: {
                        type: DataType.STRING,
                        default: 'bbb',
                        setter: (value) => value + 'aaa'
                    },
                    dateDefaultConvert: {
                        type: DataType.DATE,
                        default: '2018-02-17'
                    }
                };
            }
            static getCollectionName () {
                return 'M5Collection';
            }
        }

        /* const example = {
            a: {
                b: [
                    {
                        c: []
                    }
                ]
            },
            b: [
                {
                    c: {
                        d: []
                    }
                }
            ]
        }; */

        let model5;
        let newDoc;
        beforeEach(() => {
            model5 = new M5({ db });
            return model5.setDbValidationSchema();
        });

        afterEach(async () => {
            await model5.getCollection().drop();
        });

        describe('data validation', () => {
            it('should set validation schema on new dbs', async () => {
                await model5.setDbValidationSchema();
                const collectionOptions = await model5.getCollection().options();
                expect(collectionOptions).to.have.property('validator');
                expect(collectionOptions).to.have.property('validationLevel', 'strict');
                expect(collectionOptions).to.have.property('validationAction', 'error');
            });

            it('should set validation schema on existing dbs', async () => {
                await db.createCollection(M5.getCollectionName());
                await model5.setDbValidationSchema();
                const collectionOptions = await model5.getCollection().options();
                expect(collectionOptions).to.have.property('validator');
                expect(collectionOptions).to.have.property('validationLevel', 'strict');
                expect(collectionOptions).to.have.property('validationAction', 'error');
            });

            it('should validate required fields', () => {
                return Promise.all([
                    // missing all required fields
                    expect(model5.getCollection().insertOne({})).to.be.rejectedWith(writeError),
                    // missing one rquired field
                    expect(model5.getCollection().insertOne({ boolean: true })).to.be.rejectedWith(writeError),
                    expect(model5.getCollection().insertOne({ boolean: undefined, date: null })).to.be.rejectedWith(writeError),
                    expect(model5.getCollection().insertOne({
                        boolean: false,
                        date: new Date(),
                        docArray: [
                            {
                                string: 'abc'
                            }
                        ]
                    })).to.be.rejectedWith(writeError),
                    expect(model5.getCollection().insertOne({
                        boolean: false,
                        date: new Date(),
                        docArray: [
                            {
                                enum: 3,
                                docInArray: {}
                            }
                        ]
                    })).to.be.rejectedWith(writeError),
                    expect(model5.getCollection().insertOne({
                        boolean: false,
                        date: new Date(),
                        docArray: [
                            {
                                enum: 3,
                                docInArray: {
                                    number: null
                                }
                            }
                        ]
                    })).to.be.rejectedWith(writeError),
                    expect(model5.getCollection().insertOne({
                        boolean: false,
                        date: new Date(),
                        docArray: [
                            {
                                enum: 3,
                                docInArray: {
                                    number: 10
                                }
                            }
                        ]
                    })).to.be.fulfilled
                ]);
            });

            it('should validate string type', () => {
                // invalid string
                return Promise.all([
                    expect(model5.getCollection().insertOne({
                        boolean: true,
                        date: new Date(),
                        string: [null]
                    })).to.be.rejectedWith(writeError),
                    expect(model5.getCollection().insertOne({
                        boolean: true,
                        date: new Date(),
                        string: 'asdf'
                    })).to.be.fulfilled
                ]);
            });

            it('should validate enum type', () => {
                // invalid enum
                return Promise.all([
                    expect(model5.getCollection().insertOne({
                        boolean: true,
                        date: new Date(),
                        enum: '[undefined]'
                    })).to.be.rejectedWith(writeError),
                    expect(model5.getCollection().insertOne({
                        boolean: true,
                        date: new Date(),
                        enum: 'x'
                    })).to.be.fulfilled
                ]);
            });

            it('should validate number type', () => {
                // invalid number
                return Promise.all([
                    expect(model5.getCollection().insertOne({
                        boolean: true,
                        date: new Date(),
                        number: '1234'
                    })).to.be.rejectedWith(writeError),
                    expect(model5.getCollection().insertOne({
                        boolean: true,
                        date: new Date(),
                        number: 1234
                    })).to.be.fulfilled
                ]);
            });

            it('should validate boolean type', () => {
                // invalid boolean
                return Promise.all([
                    expect(model5.getCollection().insertOne({
                        boolean: 'undefined',
                        date: new Date()
                    })).to.be.rejectedWith(writeError),
                    expect(model5.getCollection().insertOne({
                        boolean: true,
                        date: new Date()
                    })).to.be.fulfilled
                ]);
            });

            it('should validate date type', () => {
                // invalid date
                return Promise.all([
                    expect(model5.getCollection().insertOne({
                        boolean: true,
                        date: 'undefined'
                    })).to.be.rejectedWith(writeError),
                    expect(model5.getCollection().insertOne({
                        boolean: true,
                        date: new Date()
                    })).to.be.fulfilled
                ]);
            });

            it('should validate object id type', () => {
                // invalid object id
                return Promise.all([
                    expect(model5.getCollection().insertOne({
                        boolean: true,
                        date: new Date(),
                        objectid: 'null'
                    })).to.be.rejectedWith(writeError),
                    expect(model5.getCollection().insertOne({
                        boolean: true,
                        date: new Date(),
                        objectid: new ObjectID()
                    })).to.be.fulfilled
                ]);
            });

            it('should validate document type', () => {
                return Promise.all([
                    expect(model5.getCollection().insertOne({
                        boolean: true,
                        date: new Date(),
                        doc: '{ a: 1 }'
                    })).to.be.rejectedWith(writeError),
                    expect(model5.getCollection().insertOne({
                        boolean: true,
                        date: new Date(),
                        doc: {
                            boolean: true
                        }
                    })).to.be.fulfilled
                ]);
            });

            it('should validate properties that are not defined in schema', () => {
                return Promise.all([
                    expect(model5.getCollection().insertOne({
                        boolean: true,
                        date: new Date(),
                        doc: { a: 1 } // a is not set in schema, this should fail
                    })).to.be.rejectedWith(writeError),
                    expect(model5.getCollection().insertOne({
                        boolean: true,
                        date: new Date(),
                        doc: { boolean: false }
                    })).to.be.fulfilled
                ]);
            });

            it('should validate maxLength and minLength', () => {
                return Promise.all([
                    expect(model5.getCollection().insertOne({
                        boolean: true,
                        date: new Date(),
                        stringArray: ['a']
                    })).to.be.rejectedWith(writeError),
                    expect(model5.getCollection().insertOne({
                        boolean: true,
                        date: new Date(),
                        stringArray: ['12345678901']
                    })).to.be.rejectedWith(writeError),
                    expect(model5.getCollection().insertOne({
                        boolean: true,
                        date: new Date(),
                        stringArray: ['123412']
                    })).to.be.fulfilled
                ]);
            });

            it('should validate minimum and maximum', () => {
                return Promise.all([
                    expect(model5.getCollection().insertOne({
                        boolean: true,
                        date: new Date(),
                        number: 9
                    })).to.be.rejectedWith(writeError),
                    expect(model5.getCollection().insertOne({
                        boolean: true,
                        date: new Date(),
                        docArray: [{
                            enum: 3,
                            docInArray: {
                                number: 11
                            }
                        }]
                    })).to.be.rejectedWith(writeError),
                    expect(model5.getCollection().insertOne({
                        boolean: true,
                        date: new Date(),
                        number: 10,
                        docArray: [{
                            enum: 3,
                            docInArray: {
                                number: 10
                            }
                        }]
                    })).to.be.fulfilled
                ]);
            });

            it('should validate maxItems, minItems and uniqueItems', () => {
                return Promise.all([
                    expect(model5.getCollection().insertOne({
                        boolean: true,
                        date: new Date(),
                        stringArray: ['a', 'b', '3'] // max
                    })).to.be.rejectedWith(writeError),
                    expect(model5.getCollection().insertOne({
                        boolean: true,
                        date: new Date(),
                        enumArray: [1] // min
                    })).to.be.rejectedWith(writeError),
                    expect(model5.getCollection().insertOne({
                        boolean: true,
                        date: new Date(),
                        enumArray: ['a', 'a'] // unique
                    })).to.be.rejectedWith(writeError),
                    expect(model5.getCollection().insertOne({
                        boolean: true,
                        date: new Date(),
                        stringArray: ['11', '22'],
                        enumArray: ['a', 1]
                    })).to.be.fulfilled
                ]);
            });

            it('should validate pattern', () => {
                return Promise.all([
                    expect(model5.getCollection().insertOne({
                        boolean: true,
                        date: new Date(),
                        docArray: [{
                            enum: 3,
                            string: 'aabc'
                        }]
                    })).to.be.rejectedWith(writeError),
                    expect(model5.getCollection().insertOne({
                        boolean: true,
                        date: new Date(),
                        docArray: [{
                            enum: 3,
                            string: 'abc'
                        }]
                    })).to.be.rejectedWith(writeError),
                    expect(model5.getCollection().insertOne({
                        boolean: true,
                        date: new Date(),
                        docArray: [{
                            enum: 3,
                            string: 'abcd'
                        }]
                    })).to.be.fulfilled
                ]);
            });

            it('should store null and undefined values to non-required field', () => {
                return expect(model5.getCollection().insertOne({
                    string: 'null',
                    enum: 'x',
                    boolean: true,
                    date: new Date(),
                    objectid: null,
                    number: undefined,
                    enumArray: undefined,
                    stringArray: null,
                    doc: null,
                    docArray: null
                })).to.be.fulfilled;
            });

        });

        describe('save new', () => {
            it('should add dateModified value on documents', async () => {
                const data = {
                    boolean: false,
                    date: new Date()
                };
                await model5.insert(data);
                const result = await model5.getCollection().findOne();

                expect(result).to.have.property('_id');
                expect(result._id.toHexString()).to.equal(data._id.toHexString());
                expect(result).to.have.property(GeneratedField.DATE_MODIFIED);
                expect(result[GeneratedField.DATE_MODIFIED].getTime()).to.equal(data[GeneratedField.DATE_MODIFIED].getTime());
            });

            it('should add _id and dataModified on all documents in arrays', async () => {
                const data = {
                    boolean: false,
                    date: new Date(),
                    docArray: [
                        {
                            enum: 3,
                            docInArray: {
                                number: 1,
                                nestedDoc: [
                                    {
                                        string: 'aaa'
                                    },
                                    {
                                        string: 'bbb'
                                    }
                                ]
                            }
                        },
                        {
                            enum: 5,
                            docInArray: {
                                number: 2,
                                nestedDoc: [
                                    {
                                        string: 'ccc'
                                    },
                                    {
                                        string: 'ddd'
                                    }
                                ]
                            }
                        }
                    ]
                };

                await model5.insert(data);
                const result = await model5.getCollection().findOne();

                for (let i = 0; i < 2; i++) {
                    expect(result.docArray[i]._id.toHexString()).to.equal(data.docArray[i]._id.toHexString());
                    expect(
                        result.docArray[i][GeneratedField.DATE_MODIFIED].getTime()
                    ).to.equal(data.docArray[i][GeneratedField.DATE_MODIFIED].getTime());

                    for (let j = 0; j < 2; j++) {
                        expect(
                            result.docArray[i].docInArray.nestedDoc[j]._id.toHexString()
                        ).to.equal(data.docArray[i].docInArray.nestedDoc[j]._id.toHexString());
                        expect(
                            result.docArray[i].docInArray.nestedDoc[j][GeneratedField.DATE_MODIFIED].getTime()
                        ).to.equal(data.docArray[i].docInArray.nestedDoc[j][GeneratedField.DATE_MODIFIED].getTime());
                    }
                }
            });

            it('should set default value on Document type', async () => {
                const data = {
                    boolean: false,
                    date: new Date()
                };
                await model5.insert(data);
                const result = await model5.getCollection().findOne();

                expect(result.docArray[0].enum).to.equal(5);
                expect(result.docArray[0].docInArray.number).to.equal(8);
                expect(result.docArray[0].docInArray.nestedDoc[0].string).to.equal('default');
            });

            it('should set default value on other types', async () => {
                const data = {
                    boolean: false,
                    date: new Date()
                };
                await model5.insert(data);
                const result = await model5.getCollection().findOne();

                expect(result.number).to.equal(12);
                expect(result.dateDefault.getTime()).to.equal((new Date('2018-02-17')).getTime());
                expect(result.string).to.equal('ddd');
            });

            it('should apply setter() function to new data and default data', async () => {
                const data = {
                    boolean: false,
                    date: new Date(),
                    setterString: 'xxx',
                    promiseSetterString: 'yyy'
                };
                await model5.insert(data);
                const result = await model5.getCollection().findOne();

                expect(result.setterString).to.equal('xxxaaa');
                expect(result.promiseSetterString).to.equal('yyyaaa');
                expect(result.setterDefaultString).to.equal('bbbaaa');
            });

            it('should convert number, date, boolean, _id values and convert default values', async () => {
                const date = Date.parse('2018-02-17');
                const objectid = (new ObjectID()).toHexString();
                const _id = (new ObjectID()).toHexString();
                const docArrayId = (new ObjectID()).toHexString();
                const docArrayDocInArrayNestedDocId = (new ObjectID()).toHexString();
                const data = {
                    boolean: 'false',
                    date,
                    objectid,
                    _id,
                    docArray: [
                        {
                            _id: docArrayId,
                            enum: 3,
                            docInArray: {
                                number: '5',
                                nestedDoc: [
                                    {
                                        _id: docArrayDocInArrayNestedDocId,
                                        string: '1'
                                    }
                                ]
                            }
                        }
                    ]
                };
                await model5.insert(data);
                const result = await model5.getCollection().findOne();

                expect(result.boolean).to.be.false;
                expect(result.date.getTime()).to.equal(date);
                expect(result.objectid.toHexString()).to.equal(objectid);
                expect(result._id.toHexString()).to.equal(_id);
                expect(result.docArray[0]._id.toHexString()).to.equal(docArrayId);
                expect(result.docArray[0].docInArray.number).to.equal(5);
                expect(result.docArray[0].docInArray.nestedDoc[0]._id.toHexString()).to.equal(docArrayDocInArrayNestedDocId);
                expect(result.dateDefaultConvert.getTime()).to.equal(Date.parse('2018-02-17'));
            });

            it('should return native mongo insert result e.g. ops, result, inserted, insertedCount', async () => {
                const data = {
                    boolean: false,
                    date: new Date()
                };
                const result = await model5.insert(data);

                expect(result).to.have.property('ops');
                expect(result).to.have.property('result');
                expect(result).to.have.property('insertedId', data._id);
                expect(result).to.have.property('insertedCount', 1);
            });

            it('should bulk save (insert many)', async () => {
                const data = [
                    {
                        boolean: false,
                        date: new Date()
                    },
                    {
                        boolean: true,
                        date: '2017-02-17'
                    }
                ];
                const result = await model5.insert(data);
                delete result.connection;

                expect(result).to.have.property('ops');
                expect(result).to.have.property('result');
                expect(result).to.have.property('insertedIds');
                expect(result).to.have.property('insertedCount', 2);
            });
        });

        describe('update existing', () => {

            it('should add, remove, set and add+remove scalar values in array');

            it('should add, remove, set and add+remove documents in array and set correct dateModified values');

            it('should update selected documents in array and set correct dateModified values');

            it('should bulk update (update many)');

            // should always change dateModified on the main doc when save
            // should not change dateModified date in sub document array if data is no modified

        });

    });

    describe('general functions', () => {

    });

});
