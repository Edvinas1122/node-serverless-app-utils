import { ColumnDefinition, ColumnType } from "../types";

export function buildCreateTableQuery(
	tableName: string,
	columns: ColumnDefinition[]
): string {
	const columnDefinitions = columns.map(column => {
		const parts = [
			column.name,
			column.type,
			column.primary ? 'PRIMARY KEY' : '',
			column.nullable ? '' : 'NOT NULL'
		].filter(Boolean).join(' ');

		return parts;
	});

	const foreignKeys = columns
		.filter(column => column.related)
		.map(column => {
			return `FOREIGN KEY (${column.name}) REFERENCES ${column.related!.table}(${column.related!.column})`;
		});

	const allDefinitions = [...columnDefinitions, ...foreignKeys].join(', ');

	return `CREATE TABLE ${tableName} (${allDefinitions});`;
}

export type {ColumnDefinition, ColumnType}