/*
    Contains methods to build sql queries
*/

import { buildCreateTableQuery } from "./utils/query";

export namespace SQL_Queries {
	export const list_tables = `SELECT name FROM sqlite_master WHERE type='table';`;

	export const list_columns = (tableName: string) =>
		`PRAGMA table_info(${tableName});`;

	export const create_table = (tableName: string, columns: string) =>
		`CREATE TABLE IF NOT EXISTS ${tableName} (${columns});`;

	export const insert = (tableName: string, values: Record<string, any>) => {
		const columns = Object.keys(values).join(", ");
		const placeholders = Object.keys(values).map(() => "?").join(", ");
		return `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders});`;
	};

	export const list = (tableName: string, page: number = 0, size: number = 0) => {
		let query = `SELECT * FROM ${tableName}`;

		if (size > 0) {
			const offset = page * size;
			query += ` LIMIT ${size} OFFSET ${offset}`;
		}

		return query;
	};

    export const build_create_table = buildCreateTableQuery;
}

export default SQL_Queries;