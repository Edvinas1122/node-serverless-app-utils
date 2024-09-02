import DataBase from "..";

export default {
	async fetch(
		request,
		env,
		ctx
	): Promise<Response> {
		const controller = new DataBase(env.DB);

		const build_info = await controller
			.table("test")
			.builder()
			.add("name", "TEXT")
			.add("tag", "NUMBER")
			.build()

		console.log(build_info);

		const tables = await controller.tables();
		console.log(tables)

		return new Response(JSON.stringify(tables));
	},
} satisfies ExportedHandler<Env>;