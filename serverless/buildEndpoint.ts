
export function withErrorHandling<T extends (...args: any[]) => Promise<Response>>(
    fn: T,
    errorHandler: (error: any) => Response
) {
	return async function(...args: Parameters<T>): Promise<Response> {
		try {
			return await fn(...args); // Await the result directly
		} catch (error) {
            return errorHandler(error)
		}
	};
}

type SwaggerResponse<T = any> = {
	status: number; // HTTP status code
	message?: string; // Description of the response
	data?: T; // Response data following the structure defined in Swagger
	headers?: Record<string, string>; // Optional headers
};

export function JSONResponse<T = any>({
	status,
	message,
	data,
	headers,
}: SwaggerResponse<T>): Response {
	const body = JSON.stringify({
		status,
		message,
		data,
	});

	return new Response(body, {
		status,
		headers: {
			'Content-Type': 'application/json',
			...headers,
		},
	});
}

type RouteHandler = (request: Request, env: any, ctx: any) => Promise<Response>;
type PreMiddleWareRouteHandler<Controller> = (controller: Controller, request?: Request, ctx?: any) => Promise<any>
type Middleware<Controller> = (handler: PreMiddleWareRouteHandler<Controller>) => RouteHandler;

interface RouterParams<Controller> {
	middleWare: Middleware<Controller>,
	errorHandler: (error: Error) => Response,
	docs_path?: string,
}

type RouteInfo = {
    method: string;
    path: string;
};

export class Router<Controller> {
	private routes: Map<string, PreMiddleWareRouteHandler<Controller>>
	constructor (
		private params: RouterParams<Controller>
	) {
		this.routes = new Map()
	}

	// Define a GET route
	get(path: string, handler: PreMiddleWareRouteHandler<Controller>): void {
		this.routes.set(`GET:${path}`, handler);
	}

	// Define a POST route
	post(path: string, handler: PreMiddleWareRouteHandler<Controller>): void {
		this.routes.set(`POST:${path}`, handler);
	}

	// Add more methods (PUT, DELETE, etc.) as needed
	put(path: string, handler: PreMiddleWareRouteHandler<Controller>): void {
		this.routes.set(`PUT:${path}`, handler);
	}

	delete(path: string, handler: PreMiddleWareRouteHandler<Controller>): void {
		this.routes.set(`DELETE:${path}`, handler);
	}

	// Handle the incoming request
	getHandler() {
		this.get(this.params.docs_path || "/", this.getRoutesInfo.bind(this));
		return async (request: Request, env: any, ctx: any): Promise<Response> => {
			const url = new URL(request.url);
			const key = `${request.method}:${url.pathname}`;
			
			const handler = this.routes.get(key);
	
			if (handler) {
				const wrappedHandler = this.params.middleWare(handler);
				const errorHandlerWrapped = withErrorHandling(wrappedHandler, this.params.errorHandler);
				return errorHandlerWrapped(request, env, ctx);
			}
	
			// Return a 404 response if no route matches
			return JSONResponse({
				status: 404,
				message: "route not found"
			});
		}
	}

	private async getRoutesInfo(): Promise<RouteInfo[]> {
		const routeInfos: { method: string; path: string }[] = [];
		
		for (const [key] of this.routes) {
			const [method, path] = key.split(':', 2);
			routeInfos.push({ method, path });
		}

		return routeInfos;
	}
}

export namespace Router {
	export type Handler<Controller> = PreMiddleWareRouteHandler<Controller>
	export type MiddleWare<Controller> = Middleware<Controller>
}