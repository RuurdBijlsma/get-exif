'use strict';

const buffer = require('buffer');
const {inspect} = require('util');

const {load} = require('piexifjs');
const inspectWithKind = require('inspect-with-kind');

const MINIMUM_JPEG_SIZE = 107;
// https://en.wikipedia.org/wiki/List_of_file_signatures
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);
const JPEG_SIGNATURE_STRING = JPEG_SIGNATURE.toString('latin1');
const ERROR = 'Expected a Buffer of JPEG or a Buffer-to-latin1 encoded string of it';

function createInsufficientDataSizeError(message, size) {
	const error = new RangeError(`${ERROR}, but ${message} JPEG must be ${MINIMUM_JPEG_SIZE} bytes or more.`);

	error.code = 'ERR_INSUFFICIENT_DATA_SIZE';
	error.passedSize = size;
	error.requiredSize = MINIMUM_JPEG_SIZE;
	Error.captureStackTrace(error, createInsufficientDataSizeError);

	return error;
}

function createDataNotSupportedError(message) {
	const error = new RangeError(`${ERROR}, but ${message} Byte sequence of JPEG must starts with FF D8 FF.`);

	error.code = 'ERR_DATA_NOT_SUPPORTED';
	Error.captureStackTrace(error, createDataNotSupportedError);

	return error;
}

module.exports = function getExif(...args) {
	const argLen = args.length;

	if (argLen !== 1) {
		throw new RangeError(`Expected 1 argument (<Buffer|string>), but got ${
			argLen === 0 ? 'no' : argLen
		} arguments.`);
	}

	const [data] = args;
	const len = data.length;
	const isBuffer = Buffer.isBuffer(data);

	if (!isBuffer && typeof data !== 'string') {
		const error = new TypeError(`${ERROR}, but got ${inspectWithKind(data)}.`);
		error.code = 'ERR_INVALID_ARG_TYPE';

		throw error;
	}

	if (len === 0) {
		throw createInsufficientDataSizeError(`got ${isBuffer ? 'an empty Buffer' : '\'\' (empty string)'}.`, 0);
	}

	if (len < MINIMUM_JPEG_SIZE) {
		throw createInsufficientDataSizeError(`got insufficient data size ${len}.`, len);
	}

	if (isBuffer) {
		if (!data.slice(0, 3).equals(JPEG_SIGNATURE)) {
			const originalBufferInspectmaxBytes = buffer.INSPECT_MAX_BYTES;

			buffer.INSPECT_MAX_BYTES = 3;

			const message = `got non-JPEG data ${inspect(data)}.`;

			buffer.INSPECT_MAX_BYTES = originalBufferInspectmaxBytes;
			throw createDataNotSupportedError(message);
		}
	} else if (!data.startsWith(JPEG_SIGNATURE_STRING)) {
		throw createDataNotSupportedError(`got non-JPEG string ${inspect(`${data.slice(0, 3)} ...`)}.`);
	}

	return load(isBuffer ? data.toString('latin1') : data);
};
