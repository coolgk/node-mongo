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

// model field definition
export interface IFieldSchema {
    type: DataType;
    setter?: (value: any) => any;
    enum?: (string | number | boolean)[];
    default?: any;
    model?: typeof Mongo;
    object?: ISchema;
    array?: boolean;
}

// model fields
export interface ISchema {
    [field: string]: IFieldSchema;
}

// query result
export interface IResult {
    [field: string]: any;
}

// query join definition
export interface IJoin {
    // [index: string]: {
    //     fields?: {
    //         [index: string]: 1 | 0
    //     },
    //     filters?: {
    //         [index: string]: any
    //     },
    //     join?: IJoin,
    //     data?: IResult[]
    // };
    on: string | string[];
    projection?: {
        [field: string]: 1 | 0
    };
    filters?: IQuery;
    join?: IJoin[];
    data?: Cursor;
    model?: typeof Mongo;
}

// reference pointer type for find ref in data
export interface IReferencePointer {
    parent: IResult | IResult[];
    field: string | number;
    path: string[];
    // id?: ObjectID;
}

// object id fields in search result
export interface IObjectIdInData {
    // [collection: string]: {
    //     model: typeof Mongo;
    //     dbRefsById: {
    //         [id: string]: IReferencePointer[]
    //     }
    // };
    [field: string]: IReferencePointer[];
    // {
    //     [id: string]: IReferencePointer[]
    // };
}

// mongo query object
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

    public static getCollectionName (): string {
        throw Error('Undefined static method "getCollectionName"');
    }

    public static getSchema (): ISchema {
        throw new Error('Undefined static method "getSchema"');
    }

    private _schema: ISchema = {};
    private _collection: Collection;
    private _db: Db;

    constructor (options: IOptions) {
        this._db = options.db;
        this._schema = (this.constructor as typeof Mongo).getSchema();
        this._collection = this._db.collection((this.constructor as typeof Mongo).getCollectionName());
    }

    public getObjectID (id: ObjectID | string): ObjectID | undefined {
        return ObjectID.isValid(id) ? new ObjectID(id) : undefined;
    }

    public getObjectId (id: ObjectID | string): ObjectID | undefined {
        return this.getObjectID(id);
    }

    public getDb (): Db {
        return this._db;
    }

    public getCollection (): Collection {
        return this._collection;
    }

    public async find (query: IQuery, options: IFindOptions = {}): Promise<Cursor | IResult[]> {
        const cursor = this._collection.find(
            await this._getJoinQuery(this.constructor as typeof Mongo, query, options.join),
            options
        );
        const data = options.cursor ? cursor : await cursor.toArray();
        return options.join ? await this.attachObjectIdData(data, options.join) : data;
    }

    public async attachObjectIdData (data: Cursor | IResult[], joins: IJoin[]): Promise<Cursor | IResult[]> {
        if (data.constructor.name === 'Cursor') {
            return (data as Cursor).map(
                async (row: IResult) => {
                    await this._attachDataToReferencePointer(
                        row,
                        joins,
                        {
                            type: DataType.OBJECT,
                            object: this._schema
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
                    object: this._schema,
                    array: data.constructor.name === 'Array'
                }
            );
        }
        return data;
    }

    private async _attachDataToReferencePointer (
        data: IResult[] | IResult,
        joins: IJoin[],
        fieldSchema: IFieldSchema,
        model: typeof Mongo = this.constructor as typeof Mongo
    ): Promise<void> {
        const fieldPathsInJoin = joins.reduce((fieldPaths, join) => {
            return fieldPaths.concat(toArray(join.on));
        }, [] as string[]);

        const objectIdInData: IObjectIdInData = {};
        this._findObjectIdInData(data, fieldSchema, fieldPathsInJoin, objectIdInData);

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
                        object: joinModel.getSchema(),
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

    private _findObjectIdInData (
        data: any,
        fieldConfig: IFieldSchema,
        fieldPathsInJoin: string[],
        objectIdInData: IObjectIdInData,
        referencePointer?: IReferencePointer
    ): void {
        if (fieldConfig) { // _id field and auto generated fields (e.g.dateCreated etc) do not have fieldConfig values.
            if (fieldConfig.array) {
                toArray(data).forEach((row, index) => {
                    this._findObjectIdInData(
                        row,
                        {
                            ...fieldConfig,
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
                switch (fieldConfig.type) {
                    case DataType.OBJECT:
                        if (!fieldConfig.object) {
                            throw new Error(
                                `Undefined "object" property on "${fieldConfig.type}" type in ${JSON.stringify(fieldConfig)}`
                            );
                        }
                        for (const field in data) {
                            this._findObjectIdInData(
                                data[field],
                                fieldConfig.object[field],
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
                            if (!fieldConfig.model) {
                                throw new Error(
                                    `Undefined "model" property on "${fieldConfig.type}" type in ${JSON.stringify(fieldConfig)}`
                                );
                            }

                            const fieldPath = referencePointer.path.join('.');
                            if (fieldPathsInJoin.includes(fieldPath)) {
                                const collection = fieldConfig.model.getCollectionName();

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

    private _findObjectIdFieldModel (fieldPath: string, model: typeof Mongo): typeof Mongo {
        const fields = fieldPath.split('.');
        let schema: ISchema = model.getSchema();
        while (fields.length > 1) {
            const field = fields.shift() as string;
            if (schema[field].object) {
                schema = schema[field].object as ISchema;
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
