import { D1Database, D1Result } from "@cloudflare/workers-types";

/*
	Cloudflare DB wrapper to handle common queries type safe way
*/

class DataBase {
	constructor(
		protected database: D1Database,
		protected queries: SQL_Queries = new SQL_Queries()
	) {}
	
	async tables() {
		const response = await this.handle_fetch(async () => {
			return this.database
				.prepare(this.queries.list_tables)
				.bind()
				.all();
		})
		return response as D1Result;
	}

	table(tableName: string) {
		return new Table(this.database, tableName, this.queries);
	}

	protected async handle_fetch(
		fun: () => Promise<D1Result | D1Response>
	) {
		try {
			return await fun();
		} catch (e: any) {
			console.log(e.message);
			throw e;
		}
	}
}

export class SQL_Queries {
	public list_tables = `SELECT name FROM sqlite_master WHERE type='table';`;
	public list_columns = (tableName: string) =>
		`PRAGMA table_info(${tableName});`;
	public create_table = (tableName: string, columns: string) =>
		`CREATE TABLE IF NOT EXISTS ${tableName} (${columns});`;
	public insert = (tableName: string, values: Record<string, any>) => {
		const columns = Object.keys(values).join(", ");
		const placeholders = Object.keys(values)
			.map(() => "?")
			.join(", ");
		return `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders});`;
	};
	public list = (tableName: string, page: number = 0, size: number = 0) => {
		let query = `SELECT * FROM ${tableName}`;
	
		if (size > 0) {
			const offset = page * size;
			query += ` LIMIT ${size} OFFSET ${offset}`;
		}
	
		return query;
	}
}

import { buildCreateTableQuery, ColumnDefinition} from "./src/query";

export class Table extends DataBase {
	constructor(
		database: D1Database,
		protected tableName: string,
		queries: SQL_Queries
	) {
		super(database, queries);
	}

	async columns() {
		const response = await this.handle_fetch(async () => {
			return this.database
				.prepare(this.queries.list_columns(this.tableName))
				.bind()
				.all();
		});
		return response as D1Result;
	}

	async create(definition: ColumnDefinition[]) {
		const query = buildCreateTableQuery(this.tableName, definition);
		return await this.handle_fetch(
			async () => {
				return await this.database.prepare(query).bind().run()
			}
		) as D1Response;
	}

	async delete() {
		
	}

	async insert(values: Record<string, any>) {
		const query = this.queries.insert(this.tableName, values);
		const valueArray = Object.values(values);
		return await this.handle_fetch(
			async () => {
				return await this.database
					.prepare(query)
					.bind(...valueArray)
					.all()
			}
		) as D1Result;
	}

	async list(page: number = 0, size: number = 0) {
		const query = this.queries.list(this.tableName, page, size);
		return await this.handle_fetch(async () => {
			return this.database.prepare(query).all();
		}) as D1Result;
	}

	builder(): ColumnBuilder {
		return new ColumnBuilder(this.database, this.tableName);
	}

}

import { ColumnType } from "./src/query"; 


class ColumnBuilder extends Table {
	private cols: ColumnDefinition[] = [];

	constructor(database: D1Database, tableName: string) {
		super(database, tableName, new SQL_Queries());
	}

	// Method to add a column
	add(name: string, type: ColumnType): ColumnBuilder {
		const column: ColumnDefinition = { name, type };
		this.cols.push(column);
		return this;
	}

	// Method to mark the last added column as primary key
	primary(): ColumnBuilder {
		const lastColumn = this.cols[this.cols.length - 1];
		if (lastColumn) {
			lastColumn.primary = true;
		}
		return this;
	}

	// Method to mark the last added column as nullable
	nullable(): ColumnBuilder {
		const lastColumn = this.cols[this.cols.length - 1];
		if (lastColumn) {
			lastColumn.nullable = true;
		}
		return this;
	}

	// Method to define a foreign key relationship for the last added column
	related(table: string, column: string): ColumnBuilder {
		const lastColumn = this.cols[this.cols.length - 1];
		if (lastColumn) {
			lastColumn.related = { table, column };
		}
		return this;
	}

	// Method to build the final schema and create the table
	async build() {
		const sql = buildCreateTableQuery(this.tableName, this.cols);

		return await this.handle_fetch(async () => {
			return this.database.prepare(sql).run();
		});
	}
}


export default DataBase;