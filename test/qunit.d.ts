// Type definitions for QUnit 1.10
// Project: http://qunitjs.com/
// Definitions by: Diullei Gomes <https://github.com/diullei>
// DefinitelyTyped: https://github.com/borisyankov/DefinitelyTyped


interface DoneCallbackObject {
	failed: number;
	passed: number;
	total: number;
	runtime: number;
}

interface LogCallbackObject {
	result: boolean;
	actual: Object;
	expected: Object;
	message: string;
}

interface ModuleStartCallbackObject {
	name: string;
}

interface ModuleDoneCallbackObject {
	name: string;
	failed: number;
	passed: number;
	total: number;
}

interface TestDoneCallbackObject {
	name: string;
	module: string;
	failed: number;
	passed: number;
	total: number;
}

interface TestStartCallbackObject {
	name: string;
	module: string;
	failed: number;
	passed: number;
	total: number;
}

interface Config {
	altertitle: boolean;
	autostart: boolean;
	current: Object;
	reorder: boolean;
	requireExpects: boolean;
	urlConfig: Array;
	done: any;
}

interface LifecycleObject {
	setup?: () => any;
	teardown?: () => any;
}

interface QUnitAssert {
	/* ASSERT */
	assert: any;
	current_testEnvironment: any;
	jsDump: any;

	deepEqual(actual: any, expected: any, message?: string): void;
	equal(actual: any, expected: any, message?: string): void;
	notDeepEqual(actual: any, expected: any, message?: string): void;
	notEqual(actual: any, expected: any, message?: string): void;
	notPropEqual(actual: any, expected: any, message?: string): void;
	propEqual(actual: any, expected: any, message?: string): void;
	notStrictEqual(actual: any, expected: any, message?: string): void;
	ok(state: any, message?: string): void;
	strictEqual(actual: any, expected: any, message?: string): void;
	throws(block: () => any, expected: any, message?: string): void;
	throws(block: () => any, message?: string): void;
}

interface QUnitStatic extends QUnitAssert{	
	/* ASYNC CONTROL */
	start(decrement?: number): void;
	stop(increment? : number): void;
	
	/* CALLBACKS */
	begin(callback: () => any): void;
	done(callback: (details: DoneCallbackObject) => any): void;
	log(callback: (details: LogCallbackObject) => any): void;
	moduleDone(callback: (details: ModuleDoneCallbackObject) => any): void;
	moduleStart(callback: (details: ModuleStartCallbackObject) => any): void;
	testDone(callback: (details: TestDoneCallbackObject) => any): void;
	testStart(callback: (details: TestStartCallbackObject) => any): void;
	
	/* CONFIGURATION */
	config: Config;
	
	/* TEST */
	asyncTest(name: string, expected: number, test: () => any): void;
	asyncTest(name: string, test: () => any): void;
	expect(amount: number): void;
	module(name: string, lifecycle?: LifecycleObject): void;
	test(title: string, expected: number, test: (assert: QUnitAssert) => any): void;
	test(title: string, test: (assert: QUnitAssert) => any): void;

	// https://github.com/jquery/qunit/blob/master/qunit/qunit.js#L1568
	equiv(a: any, b: any): void;

	// https://github.com/jquery/qunit/blob/master/qunit/qunit.js#L661
	raises: any;

	// https://github.com/jquery/qunit/blob/master/qunit/qunit.js#L897
	push(result: any, actual: any, expected: any, message: any): any;

	// https://github.com/jquery/qunit/blob/master/qunit/qunit.js#L839
	reset(): any;
}

/* ASSERT */
declare function deepEqual(actual: any, expected: any, message?: string): void;
declare function equal(actual: any, expected: any, message?: string): void;
declare function notDeepEqual(actual: any, expected: any, message?: string): void;
declare function notEqual(actual: any, expected: any, message?: string): void;
declare function notStrictEqual(actual: any, expected: any, message?: string): void;
declare function ok(state: any, message?: string): void;
declare function strictEqual(actual: any, expected: any, message?: string): void;
declare function throws(block: () => any, expected: any, message?: string): void;
declare function throws(block: () => any, message?: string): void;

/* ASYNC CONTROL */
declare function start(decrement?: number): void;
declare function stop(increment? : number): void;
	
/* CALLBACKS */
declare function begin(callback: () => any): void;
declare function done(callback: (details: DoneCallbackObject) => any): void;
declare function log(callback: (details: LogCallbackObject) => any): void;
declare function moduleDone(callback: (details: ModuleDoneCallbackObject) => any): void;
declare function moduleStart(callback: (name: string) => any): void;
declare function testDone(callback: (details: TestDoneCallbackObject) => any): void;
declare function testStart(callback: (details: TestStartCallbackObject) => any): void;
	
/* TEST */
declare function asyncTest(name: string, expected?: any, test?: () => any): void;
declare function expect(amount: number): void;

// ** conflict with TypeScript module keyword. Must be used on QUnit namespace
//declare var module: (name: string, lifecycle?: LifecycleObject) => any;

declare function test(title: string, expected: number, test: (assert?: QUnitAssert) => any): void;
declare function test(title: string, test: (assert?: QUnitAssert) => any): void;

declare function notPropEqual(actual: any, expected: any, message?: string): void;
declare function propEqual(actual: any, expected: any, message?: string): void;

// https://github.com/jquery/qunit/blob/master/qunit/qunit.js#L1568
declare function equiv(a: any, b: any): void;

// https://github.com/jquery/qunit/blob/master/qunit/qunit.js#L661
declare var raises: any;

/* QUNIT */
declare var QUnit: QUnitStatic;