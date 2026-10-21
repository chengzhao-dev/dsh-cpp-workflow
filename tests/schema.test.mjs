// The host accepts a deliberately small JSON Schema subset. These tests pin
// that subset locally so a future tool schema cannot reintroduce a keyword the
// host rejects. The plugin currently registers no tools; the validator is still
// exercised against representative parameter and result schemas.
import assert from 'node:assert/strict'
import test from 'node:test'

const ALLOWED = new Set([
  'type',
  'oneOf',
  'properties',
  'required',
  'additionalProperties',
  'items',
  'enum',
  'const',
  'description',
  'title',
  'default',
  'examples',
])

const TYPES = new Set(['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'])

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** Throws on the first violation, so tests can use assert.doesNotThrow. */
export function assertSchemaSubset(schema, pointer = '#') {
  assert.ok(isRecord(schema), `${pointer} must be an object`)

  for (const key of Object.keys(schema)) {
    assert.ok(ALLOWED.has(key), `${pointer} uses unsupported keyword "${key}"`)
  }

  if ('type' in schema) {
    assert.equal(typeof schema.type, 'string', `${pointer}.type must be one string`)
    assert.ok(TYPES.has(schema.type), `${pointer}.type is not a JSON type`)
  }

  if ('required' in schema) {
    assert.ok(Array.isArray(schema.required), `${pointer}.required must be an array`)
    for (const [index, name] of schema.required.entries()) {
      assert.equal(typeof name, 'string', `${pointer}.required[${index}] must be a string`)
    }
  }

  if ('enum' in schema) {
    assert.ok(Array.isArray(schema.enum) && schema.enum.length > 0, `${pointer}.enum must be non-empty`)
  }

  if ('examples' in schema) {
    assert.ok(Array.isArray(schema.examples), `${pointer}.examples must be an array`)
  }

  if ('properties' in schema) {
    assert.ok(isRecord(schema.properties), `${pointer}.properties must be an object`)
    for (const [name, child] of Object.entries(schema.properties)) {
      assertSchemaSubset(child, `${pointer}.properties.${name}`)
    }
  }

  if ('additionalProperties' in schema) {
    assert.equal(typeof schema.additionalProperties, 'boolean', `${pointer}.additionalProperties must be boolean`)
  }

  if ('items' in schema) {
    assertSchemaSubset(schema.items, `${pointer}.items`)
  }

  if ('oneOf' in schema) {
    assert.ok(Array.isArray(schema.oneOf), `${pointer}.oneOf must be an array`)
    assert.ok(schema.oneOf.length >= 2, `${pointer}.oneOf must offer at least two branches`)
    for (const [index, child] of schema.oneOf.entries()) {
      assertSchemaSubset(child, `${pointer}.oneOf[${index}]`)
    }
    for (const forbidden of ['type', 'properties', 'required']) {
      assert.equal(
        forbidden in schema,
        false,
        `${pointer} cannot combine oneOf with top-level ${forbidden}; move it into each branch`,
      )
    }
  }
}

test('accepts a tool parameter schema in the host subset', () => {
  assertSchemaSubset({
    type: 'object',
    properties: {
      project: { type: 'string', description: 'Absolute path' },
      mode: { type: 'string', enum: ['static', 'live'], default: 'static' },
      compiler: {
        oneOf: [{ type: 'string', enum: ['clang'] }, { type: 'string', enum: ['gcc'] }],
      },
      limits: {
        type: 'object',
        properties: { depth: { type: 'integer', default: 12 } },
        required: ['depth'],
        additionalProperties: false,
      },
    },
    required: ['project'],
    additionalProperties: false,
  })
})

test('accepts a nullable field only as a two-branch oneOf', () => {
  assertSchemaSubset({
    type: 'object',
    properties: {
      note: {
        oneOf: [{ type: 'string' }, { type: 'null' }],
        description: 'null means absent',
      },
    },
    additionalProperties: false,
  })
})

test('rejects anyOf even when it looks equivalent to oneOf', () => {
  assert.throws(
    () => assertSchemaSubset({ anyOf: [{ type: 'string' }, { type: 'number' }] }),
    /unsupported keyword "anyOf"/,
  )
})

test('rejects a type array', () => {
  assert.throws(
    () => assertSchemaSubset({ type: ['string', 'null'] }),
    /type must be one string/,
  )
})

test('rejects oneOf combined with a top-level type', () => {
  assert.throws(
    () => assertSchemaSubset({ type: 'string', oneOf: [{ type: 'string' }, { type: 'null' }] }),
    /cannot combine oneOf/,
  )
})

test('rejects a one-branch oneOf', () => {
  assert.throws(
    () => assertSchemaSubset({ oneOf: [{ type: 'string' }] }),
    /at least two branches/,
  )
})

test('rejects maxItems and minimum anywhere in the tree', () => {
  assert.throws(
    () => assertSchemaSubset({ type: 'array', items: { type: 'string', maxItems: 3 } }),
    /unsupported keyword "maxItems"/,
  )
  assert.throws(
    () => assertSchemaSubset({ type: 'integer', minimum: 0 }),
    /unsupported keyword "minimum"/,
  )
})

test('rejects an object additionalProperties schema', () => {
  assert.throws(
    () => assertSchemaSubset({ type: 'object', additionalProperties: { type: 'string' } }),
    /additionalProperties must be boolean/,
  )
})

test('rejects unknown keywords in nested properties', () => {
  assert.throws(
    () => assertSchemaSubset({ type: 'object', properties: { x: { type: 'string', pattern: '^x$' } } }),
    /unsupported keyword "pattern"/,
  )
})

test('the runtime entry injects only skills and registers no tools', async () => {
  const entry = await import('../lib/index.js')
  const registered = []
  let toolCalled = false
  entry.apply({
    skills: {
      registerProvider(factory) {
        registered.push(factory())
      },
    },
    tools: {
      register() {
        toolCalled = true
        throw new Error('apply() must not register tools')
      },
    },
  })
  assert.equal(entry.name, 'dsh-cpp-workflow')
  assert.deepEqual(entry.inject, ['skills'])
  assert.equal(registered.length, 1)
  assert.equal(registered[0].name, 'dsh-cpp-workflow')
  assert.equal(toolCalled, false)
})
