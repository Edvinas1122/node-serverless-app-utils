import DataBase from "./utils/d1-database/index"
import {JSONResponse, Router} from "./utils/serverless/buildEndpoint"

const withDatabase: Router.MiddleWare<DataBase> = (
	handler: (
		controller: DataBase,
		request?: Request,
		ctx?: any
	) => Promise<any>
) => {
	return async (
		request: Request,
		env: any,
		ctx: any
	) => {
		const controller = new DataBase(env.DB);
		const response = await handler(controller, request, ctx);
		console.log(response);
		return new Response(JSON.stringify(response))
	}
}

const router = new Router({
	middleWare: withDatabase,
	errorHandler
});

router.get("/build", buildTableExample)
router.get("/add", addItem)
router.get("/list", listTable)

async function buildTableExample(
	controller: DataBase,
) {
	const build_info = await controller
		.table("test")
		.builder()
		.add("name", DataBase.ColumnTypes.TEXT).primary()
		.add("tag", DataBase.ColumnTypes.TEXT)
		.build();
	console.log(build_info);
	const tables = await controller.tables();
	return tables;
}

async function addItem(
	controller: DataBase
) {
	const info = await controller
		.table("test")
		.insert({
			"name": "peter",
			"tag": "victor"
		})
	return info;
}

async function listTable(
	controller: DataBase
) {
	const info = await controller
		.table("test")
		.list()
	return info;
}

function errorHandler(error: any) {
	console.error(error.message);
	return JSONResponse({
		status: 400,
		message: error.message
	})
}

export default {
	fetch: router.getHandler(),
} satisfies ExportedHandler<Env>;