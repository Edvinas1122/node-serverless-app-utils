enum ColumnTypes {
	TEXT = "TEXT",
	NUMBER = "NUMBER",
	BOOLEAN = "BOOLEAN",
	DATE = "DATE",
	// Add more column types as needed
}

export type ColumnType = keyof typeof ColumnTypes;

export type ColumnDefinition = {
	name: string;
	type: ColumnType;
	primary?: boolean;
	nullable?: boolean;
	related?: {
		table: string;
		column: string;
	};
};