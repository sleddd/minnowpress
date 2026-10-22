import { describe, expect, it } from 'vitest';
import { describeDevice } from './user-agent';

describe('describeDevice', () => {
	it('names common browsers and systems', () => {
		expect(
			describeDevice(
				'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'
			)
		).toBe('Safari on Mac');
		expect(
			describeDevice(
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Edg/130.0'
			)
		).toBe('Edge on Windows');
		expect(
			describeDevice(
				'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1'
			)
		).toBe('Chrome on iPhone');
		expect(
			describeDevice('Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0')
		).toBe('Firefox on Linux');
		expect(describeDevice('Mozilla/5.0 (Linux; Android 14) Opera OPR/80')).toBe('Opera on Android');
		expect(describeDevice('Mozilla/5.0 (iPad; CPU OS 17_5) Safari/604.1')).toBe('Safari on iPad');
		expect(describeDevice('Mozilla/5.0 (X11; CrOS x86_64) Chrome/130.0')).toBe(
			'Chrome on ChromeOS'
		);
	});

	it('falls back gracefully', () => {
		expect(describeDevice(null)).toBe('Unknown device');
		expect(describeDevice('curl/8.0')).toBe('Unknown device');
		expect(describeDevice('Something Firefox/1.0')).toBe('Firefox');
		expect(describeDevice('(Windows) mystery')).toBe('Windows');
	});
});
