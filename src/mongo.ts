import { Db, ObjectID, Cursor, Collection, FindOneOptions } from 'mongodb';
import { toArray } from '@coolgk/array';

// model field data types
export enum DataType {
    STRING = 'string',
    NUMBER = 'number',
    OBJECT = 'object',
    ENUM = 'enum',
    BOOLEAN = 'boolean',
    DATE = 'date',
    OBJECTID = 'objectid'
}

// model data schema
export interface IDataSchema {
    type: DataType;
    setter?: (value: any) => any;
    enum?: (string | number | boolean)[];
    default?: any;
    model?: typeof Mongo;
    schema?: ISchema;
    array?: boolean;
}

// model schema
export interface ISchema {
    [field: string]: IDataSchema;
}

// query result
export interface IResult {
    [field: string]: any;
}

// query join definition
export interface IJoin {
    on: string | string[];
    projection?: {
        [field: string]: 1 | 0
    };
    filters?: IQuery;
    join?: IJoin[];
    data?: Cursor;
    model?: typeof Mongo;
}

// reference pointer to object id values found in a query result
export interface IReferencePointer {
    parent: IResult | IResult[];
    field: string | number;
    path: string[];
}

// object id values in search result
export interface IObjectIdInData {
    [field: string]: IReferencePointer[];
}

// mongo query
export interface IQuery {
    [index: string]: any;
}

export interface IFindOptions extends FindOneOptions {
    join?: IJoin[];
    cursor?: boolean;
}

export interface IOptions {
    db: Db;
}

export class Mongo {

    /**
     * classes that extends this class must implement this static method to set the collection name of the model
     * @static
     * @returns {string} - the collection name of the model
     * @memberof Mongo
     */
    public static getCollectionName (): string {
        throw Error('Undefined static method "getCollectionName"');
    }

    /**
     * classes that extends this class must implement this static method to set the schema of the model
     * @static
     * @returns {object} - model schema
     * @memberof Mongo
     */
    public static getSchema (): ISchema {
        throw new Error('Undefined static method "getSchema"');
    }

    private _schema: ISchema = {};
    private _collection: Collection;
    private _db: Db;

    /* tslint:disable */
    /**
     * Creates an instance of Mongo.
     * @param {object} options
     * @param {object} options.db - a Db instance from mongo node client e.g. v3.x MongoClient.connect(url, (err, client) => { const db = client.db(dbName); ... }) v2.x MongoClient.connect(url, (err, db) => { ... })
     * @memberof Mongo
     */
    /* tslint:enable */
    constructor (options: IOptions) {
        this._db = options.db;
        this._schema = (this.constructor as typeof Mongo).getSchema();
        this._collection = this._db.collection((this.constructor as typeof Mongo).getCollectionName());
    }

    /**
     * @param {(object | string)} id - a string or an instance of ObjectID
     * @returns {(object | undefined)} - an ObjectID or undefined if "id" is not an valid ObjectID string
     * @memberof Mongo
     */
    public getObjectID (id: ObjectID | string): ObjectID | undefined {
        return ObjectID.isValid(id) ? new ObjectID(id) : undefined;
    }

    /**
     * an alias of the getObjectID() method.
     */
    public getObjectId (id: ObjectID | string): ObjectID | undefined {
        return this.getObjectID(id);
    }

    /**
     * @returns {object} - returns the db instance previously passed into the constructor
     * @memberof Mongo
     */
    public getDb (): Db {
        return this._db;
    }

    /**
     * @returns {object} - mongo Collection insance of the current model
     * @memberof Mongo
     */
    public getCollection (): Collection {
        return this._collection;
    }

    /* tslint:disable */
    /**
     * see parameter description for query and options in http://mongodb.github.io/node-mongodb-native/3.0/api/Collection.html#find
     * @param {object} query - same as query in mongo collection.find()
     * @param {object} [options={}] - all value in options for mongo collection.find()
     * @param {object} [options.join] - query for joining other collections. format: { on: string | string[], projection?: { [fieldname]: 1 | 0 }, filters?: {...}, join?: { on: ..., projection?: ..., filters?: ..., join?: ... }[] }
     * @param {object} [options.cursor=false] - if to return a cursor, by default an array is returned
     * @returns {(Promise<Cursor | object[]>)}
     * @memberof Mongo
     */
    /* tslint:enable */
    public async find (query: IQuery, options: IFindOptions = {}): Promise<Cursor | IResult[]> {
        const cursor = this._collection.find(
            await this._getJoinQuery(this.constructor as typeof Mongo, query, options.join),
            options
        );
        const data = options.cursor ? cursor : await cursor.toArray();
        return options.join ? await this.attachObjectIdData(data, options.join) : data;
    }

    /* tslint:disable */
    /**
     * Attach referenced collection data to a query result. Note: filters in join are not supported if this method is used directly on a query result i.e. not using find(). Use find() if you want to filter result by the data in referenced collections
     * @param {(Cursor | object[])} data - a mongo query result
     * @param {object[]} joins - query for joining other collections. format: { on: string | string[], projection?: { [fieldname]: 1 | 0 }, join?: { on: ..., projection?: ..., join?: ... }[] }
     * @returns {(Promise<Cursor | object[]>)}
     * @memberof Mongo
     */
    /* tslint:enable */
    public async attachObjectIdData (data: Cursor | IResult[], joins: IJoin[]): Promise<Cursor | IResult[]> {
        if (data.constructor.name === 'Cursor') {
            return (data as Cursor).map(
                async (row: IResult) => {
                    await this._attachDataToReferencePointer(
                        row,
                        joins,
                        {
                            type: DataType.OBJECT,
                            schema: this._schema
                        }
                    );
                    return row;
                }
            );
        } else {
            await this._attachDataToReferencePointer(
                data,
                joins,
                {
                    type: DataType.OBJECT,
                    schema: this._schema,
                    array: data.constructor.name === 'Array'
                }
            );
        }
        return data;
    }

    /**
     * attach referenced data to reference pointers found in query result
     * @ignore
     * @private
     * @param {(object[] | object)} data - query data
     * @param {object[]} joins - query for joining other collections
     * @param {object} dataSchema - schema of the data
     * @param {object} [model=this.constructor] - model class of the data
     * @returns {Promise<void>}
     * @memberof Mongo
     */
    private async _attachDataToReferencePointer (
        data: IResult[] | IResult,
        joins: IJoin[],
        dataSchema: IDataSchema,
        model: typeof Mongo = this.constructor as typeof Mongo
    ): Promise<void> {
        const fieldPathsInJoin = joins.reduce((fieldPaths, join) => {
            return fieldPaths.concat(toArray(join.on));
        }, [] as string[]);

        const objectIdInData: IObjectIdInData = {};
        this._findObjectIdInData(data, dataSchema, fieldPathsInJoin, objectIdInData);

        if (Object.keys(objectIdInData).length === 0) {
            return;
        }

        for (const join of joins) {
            const fields = toArray(join.on);
            const joinModel = join.model || this._findObjectIdFieldModel(fields[0], model);

            const referencePointers: IObjectIdInData = {};
            const ids: ObjectID[] = [];
            // find all ids and create an object of reference pointers indexed by id
            fields.forEach((field) => {
                // field could be in join but not in the projection of the upper level
                // example in test case: should filter resursive object id referenced fields when there are multiple matches
                if (objectIdInData[field]) {
                    objectIdInData[field].forEach((referencePointer) => {
                        const id = (referencePointer.parent as any)[referencePointer.field]._id;
                        if (!referencePointers[id]) {
                            referencePointers[id] = [];
                        }
                        referencePointers[id].push(referencePointer);
                        ids.push(id);
                    });
                }
            });

            let joinData = join.data;
            if (!joinData) {
                const projection = join.projection;
                if (projection && projection._id === 0) {
                    projection._id = 1;
                }

                joinData = this._db.collection(joinModel.getCollectionName()).find(
                    {
                        _id: {
                            $in: ids
                        }
                    },
                    { projection }
                );
            }

            // if else here is for looping cursor only once to attach data
            if (join.join) {
                await this._attachDataToReferencePointer(
                    await joinData.map((row: IResult) => {
                        // field could be in join but not in the projection of the upper level
                        // example in test case: should filter resursive object id referenced fields when there are multiple matches
                        if (referencePointers[row._id]) {
                            referencePointers[row._id].forEach((referencePointer) => {
                                (referencePointer.parent as any)[referencePointer.field] = row;
                            });
                        }
                        return row;
                    }).toArray(),
                    join.join,
                    {
                        type: DataType.OBJECT,
                        schema: joinModel.getSchema(),
                        array: true
                    },
                    joinModel
                );
            } else {
                await new Promise((resolve) => {
                    (joinData as Cursor).forEach(
                        (row) => {
                            // field could be in join but not in the projection of the upper level
                            // example in test case: should filter resursive object id referenced fields when there are multiple matches
                            if (referencePointers[row._id]) {
                                referencePointers[row._id].forEach((referencePointer) => {
                                    (referencePointer.parent as any)[referencePointer.field] = row;
                                });
                            }
                        },
                        () => resolve()
                    );
                });
            }
        }
    }

    /**
     * find all object id values in a query result
     * @ignore
     * @private
     * @param {*} data - (row) data in query
     * @param {object} fieldSchema - data schema
     * @param {string[]} fieldPathsInJoin - values of the "on" fields in joins
     * @param {IObjectIdInData} objectIdInData - object id values found in a query result
     * @param {IReferencePointer} [referencePointer] - current reference pointer to the data param
     * @memberof Mongo
     */
    private _findObjectIdInData (
        data: any,
        fieldSchema: IDataSchema,
        fieldPathsInJoin: string[],
        objectIdInData: IObjectIdInData,
        referencePointer?: IReferencePointer
    ): void {
        if (fieldSchema) { // _id field and auto generated fields (e.g.dateCreated etc) do not have fieldConfig values.
            if (fieldSchema.array) {
                toArray(data).forEach((row, index) => {
                    this._findObjectIdInData(
                        row,
                        {
                            ...fieldSchema,
                            array: false
                        },
                        fieldPathsInJoin,
                        objectIdInData,
                        {
                            parent: data,
                            field: index,
                            path: referencePointer && referencePointer.path || []
                        }
                    );
                });
            } else {
                switch (fieldSchema.type) {
                    case DataType.OBJECT:
                        if (!fieldSchema.schema) {
                            throw new Error(
                                `Undefined "schema" property on "${fieldSchema.type}" type in ${JSON.stringify(fieldSchema)}`
                            );
                        }
                        for (const field in data) {
                            this._findObjectIdInData(
                                data[field],
                                fieldSchema.schema[field],
                                fieldPathsInJoin,
                                objectIdInData,
                                {
                                    parent: data,
                                    field,
                                    path: toArray(referencePointer && referencePointer.path).concat(field)
                                }
                            );
                        }
                        break;
                    case DataType.OBJECTID:
                        if (data && referencePointer) {
                            if (!fieldSchema.model) {
                                throw new Error(
                                    `Undefined "model" property on "${fieldSchema.type}" type in ${JSON.stringify(fieldSchema)}`
                                );
                            }

                            const fieldPath = referencePointer.path.join('.');
                            if (fieldPathsInJoin.includes(fieldPath)) {
                                const collection = fieldSchema.model.getCollectionName();

                                if (!objectIdInData[fieldPath]) {
                                    objectIdInData[fieldPath] = [];
                                }

                                // clear object id data, if refereced data is not found,
                                // the result will be { _id: ObjectId(...) } instead of the origin ObjectID or DBRef
                                (referencePointer.parent as any)[referencePointer.field] = {
                                    // data.oid = DbRef type in mongo
                                    _id: data.constructor.name === 'ObjectID' ? data : data.oid
                                };
                                objectIdInData[fieldPath].push(referencePointer);
                            }
                        }
                        break;
                }
            }
        }
    }

    /**
     * create a query based on joins
     * @ignore
     * @private
     * @param {object} model - model class on which the join is applied
     * @param {object} [query={}] - existing queries
     * @param {object[]} [joins] - query for joining other collections
     * @returns {Promise<object>} - query based on join data
     * @memberof Mongo
     */
    private async _getJoinQuery (model: typeof Mongo, query: IQuery = {}, joins?: IJoin[]): Promise<IQuery> {
        if (query && typeof(query._id) === 'string') {
            query._id = this.getObjectID(query._id);
        }

        if (joins) {
            const joinQuery: IQuery = {
                $and: []
            };

            for (const join of joins) {
                const fields = toArray(join.on);
                join.model = this._findObjectIdFieldModel(fields[0], model);
                const filters = await this._getJoinQuery(join.model, join.filters, join.join);

                if (Object.keys(filters).length) {
                    const projection = join.projection || {};
                    if (projection._id === 0) {
                        projection._id = 1;
                    }

                    const cursor = this._db.collection((join.model as typeof Mongo).getCollectionName() as string).find(
                        filters,
                        {
                            projection
                        }
                    );

                    const ids = (await cursor.toArray()).map((row) => row._id);
                    fields.forEach((field) => {
                        joinQuery.$and.push({
                            [field]: {
                                $in: ids
                            }
                        });
                    });

                    cursor.rewind();
                    join.data = cursor;
                }
            }

            if (joinQuery.$and.length) {
                if (query && Object.keys(query).length) {
                    joinQuery.$and.push(query);
                }
                return joinQuery;
            }
        }

        return query;
    }

    /**
     * find the model class that the join field references to
     * @ignore
     * @private
     * @param {string} fieldPath - the "on" value in join i.e the field name/path of the join
     * @param {object} model - model class that contains the field
     * @returns {object} - model class that the field references to
     * @memberof Mongo
     */
    private _findObjectIdFieldModel (fieldPath: string, model: typeof Mongo): typeof Mongo {
        const fields = fieldPath.split('.');
        let schema: ISchema = model.getSchema();
        while (fields.length > 1) {
            const field = fields.shift() as string;
            if (schema[field].schema) {
                schema = schema[field].schema as ISchema;
            } else {
                throw new Error(
                    'Undefined "model" property or Invalid Object ID field in join statement.\n'
                    + `On: "${fieldPath}"\n`
                    + `Collection: ${model.getCollectionName()}\n`
                    + `Schema: ${JSON.stringify(model.getSchema())}\n`
                );
            }
        }

        const objectIdField = fields.shift();
        const fieldModel = objectIdField && schema && schema[objectIdField] && schema[objectIdField].model;
        if (fieldModel) {
            return fieldModel;
        }
        throw new Error(
            '\nUndefined "model" property or Invalid Object ID field in join statement.\n'
            + `On: "${fieldPath}"\n`
            + `Collection: ${model.getCollectionName()}\n`
            + `Schema: ${JSON.stringify(model.getSchema())}\n`
        );
    }

}

export default Mongo;
