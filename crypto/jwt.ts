
class JWT {
	constructor(
		private secret: string,
		private expires = -1
	) {}

	static base64UrlEncode(arrayBuffer) {
		return btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=+$/, '');
	}

	static base64UrlDecode(base64Url) {
		const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
		const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
		return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
	}

	static async deriveKeyFromString(password, salt) {
		const encoder = new TextEncoder();
		const passwordData = encoder.encode(password);

		const keyMaterial = await crypto.subtle.importKey(
			'raw',
			passwordData,
			{ name: 'PBKDF2' },
			false,
			['deriveKey']
		);

		const key = await crypto.subtle.deriveKey(
			{
			name: 'PBKDF2',
			salt: salt,
			iterations: 100000,
			hash: 'SHA-256'
			},
			keyMaterial,
			{ name: 'HMAC', hash: 'SHA-256', length: 256 },
			true,
			['sign', 'verify']
		);

		return key;
	}

	private stampPayload(payload) {
		return { ...payload, iat: Math.floor(Date.now() / 1000), exp: this.expires};
	}

	async signToken(
		payload: Record<string, any>
	) {
		const stampedPayload = this.stampPayload(payload);
		const encoder = new TextEncoder();
		const header = { alg: "HS256", typ: "JWT" };
		const encodedHeader = JWT.base64UrlEncode(encoder.encode(JSON.stringify(header)));
		const encodedPayload = JWT.base64UrlEncode(encoder.encode(JSON.stringify(stampedPayload)));

		const dataToSign = `${encodedHeader}.${encodedPayload}`;

		// Generate a salt for the key derivation
		const salt = crypto.getRandomValues(new Uint8Array(16));
		const key = await JWT.deriveKeyFromString(this.secret, salt);

		const signature = await crypto.subtle.sign(
			"HMAC",
			key,
			encoder.encode(dataToSign)
		);

		const encodedSignature = JWT.base64UrlEncode(new Uint8Array(signature));
		const encodedSalt = JWT.base64UrlEncode(salt);

		return `${encodedHeader}.${encodedPayload}.${encodedSignature}.${encodedSalt}`;
	}

	async verifyToken(token) {
		const parts = token.split('.');
		if (parts.length !== 4) {
			return { valid: false };
		}

		const [encodedHeader, encodedPayload, encodedSignature, encodedSalt] = parts;

		const encoder = new TextEncoder();
		const header = JSON.parse(new TextDecoder().decode(JWT.base64UrlDecode(encodedHeader)));
		const payload = JSON.parse(new TextDecoder().decode(JWT.base64UrlDecode(encodedPayload)));
		const signature = JWT.base64UrlDecode(encodedSignature);
		const salt = JWT.base64UrlDecode(encodedSalt);

		const dataToVerify = `${encodedHeader}.${encodedPayload}`;
		const key = await JWT.deriveKeyFromString(this.secret, salt);

		const valid = await crypto.subtle.verify(
			"HMAC",
			key,
			signature,
			encoder.encode(dataToVerify)
		);
		const not_expired = !JWT.haveExpired(payload);
		return { valid: valid && not_expired, header, payload };
	}

	static haveExpired(payload: { iat: number, exp: number }): boolean {
		if (!payload.iat || !payload.exp) {
			return true;
		}
	
		if (payload.exp === -1) {
			return false
		}

		const currentTime = Math.floor(Date.now() / 1000);
		return currentTime > payload.exp;
	}
}

export default JWT;