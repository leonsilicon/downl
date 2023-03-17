import fs from 'node:fs'
import path from 'node:path'

import contentDisposition from 'content-disposition'
import getStream from 'get-stream'
// @ts-expect-error: no types
import isZip from 'is-zip'
import nock from 'nock'
import { pathExists } from 'path-exists'
// @ts-expect-error: no types
import randomBuffer from 'random-buffer'
import { beforeAll, expect, test } from 'vitest'

import m from '~/index.js'

beforeAll(() => {
	nock('http://foo.bar')
		.persist()
		.get('/404')
		.reply(404)
		.get('/foo.zip')
		.replyWithFile(200, path.join(__dirname, 'fixture.zip'))
		.get('/foo.js')
		.replyWithFile(200, __filename)
		.get('/querystring.zip')
		.query({ param: 'value' })
		.replyWithFile(200, path.join(__dirname, 'fixture.zip'))
		.get('/dispo')
		.replyWithFile(200, path.join(__dirname, 'fixture.zip'), {
			'Content-Disposition': contentDisposition('dispo.zip'),
		})
		.get('/foo*bar.zip')
		.replyWithFile(200, path.join(__dirname, 'fixture.zip'))
		.get('/large.bin')
		.reply(200, randomBuffer(7_928_260))
		.get('/redirect.zip')
		.reply(302, null, { location: 'http://foo.bar/foo.zip' })
		.get('/redirect-https.zip')
		.reply(301, null, { location: 'https://foo.bar/foo-https.zip' })
		.get('/filetype')
		.replyWithFile(200, path.join(__dirname, 'fixture.zip'))

	nock('https://foo.bar')
		.persist()
		.get('/foo-https.zip')
		.replyWithFile(200, path.join(__dirname, 'fixture.zip'))
})

test('download as stream', async () => {
	expect(isZip(await getStream.buffer(m('http://foo.bar/foo.zip')))).toBe(true)
})

test('download as promise', async () => {
	expect(isZip(await m('http://foo.bar/foo.zip'))).toBe(true)
})

test('download a very large file', async () => {
	expect(
		(await getStream.buffer(m('http://foo.bar/large.bin'))).length
	).to.equal(7_928_260)
})

test('download and rename file', async () => {
	await m('http://foo.bar/foo.zip', __dirname, { filename: 'bar.zip' })
	expect(await pathExists(path.join(__dirname, 'bar.zip'))).toBe(true)
	await fs.promises.unlink(path.join(__dirname, 'bar.zip'))
})

test('save file', async () => {
	await m('http://foo.bar/foo.zip', __dirname)
	expect(await pathExists(path.join(__dirname, 'foo.zip'))).toBe(true)
	await fs.promises.unlink(path.join(__dirname, 'foo.zip'))
})

test('extract file', async () => {
	await m('http://foo.bar/foo.zip', __dirname, { extract: true })
	expect(await pathExists(path.join(__dirname, 'file.txt'))).toBe(true)
	await fs.promises.unlink(path.join(__dirname, 'file.txt'))
})

test('extract file that is not compressed', async () => {
	await m('http://foo.bar/foo.js', __dirname, { extract: true })
	expect(await pathExists(path.join(__dirname, 'foo.js'))).toBe(true)
	await fs.promises.unlink(path.join(__dirname, 'foo.js'))
})

test('error on 404', async () => {
	expect(
		async () => m('http://foo.bar/404'),
		'Response code 404 (Not Found)'
	).toThrow()
})

test('rename to valid filename', async () => {
	await m('http://foo.bar/foo*bar.zip', __dirname)
	expect(await pathExists(path.join(__dirname, 'foo!bar.zip'))).toBe(true)
	await fs.promises.unlink(path.join(__dirname, 'foo!bar.zip'))
})

test('follow redirects', async () => {
	expect(isZip(await m('http://foo.bar/redirect.zip'))).toBe(true)
})

test('follow redirect to https', async () => {
	expect(isZip(await m('http://foo.bar/redirect-https.zip'))).toBe(true)
})

test('handle query string', async () => {
	await m('http://foo.bar/querystring.zip?param=value', __dirname)
	expect(await pathExists(path.join(__dirname, 'querystring.zip'))).toBe(true)
	await fs.promises.unlink(path.join(__dirname, 'querystring.zip'))
})

test('handle content dispositon', async () => {
	await m('http://foo.bar/dispo', __dirname)
	expect(await pathExists(path.join(__dirname, 'dispo.zip'))).toBe(true)
	await fs.promises.unlink(path.join(__dirname, 'dispo.zip'))
})

test('handle filename from file type', async () => {
	await m('http://foo.bar/filetype', __dirname)
	expect(await pathExists(path.join(__dirname, 'filetype.zip'))).toBe(true)
	await fs.promises.unlink(path.join(__dirname, 'filetype.zip'))
})
