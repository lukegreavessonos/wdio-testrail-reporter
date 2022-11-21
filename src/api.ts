import axios, { AxiosRequestConfig } from 'axios'
import logger from '@wdio/logger'

import type { TestResults, NewTest, ReporterOptions, TestCase } from './types'

const log = logger('TestrailReporter')

export default class TestRailAPI {
    #config: AxiosRequestConfig = {}
    #projectId: string
    #baseUrl: string

    /**
     *
     * @param username username of testrail instance
     * @param password API token
     */
    constructor (options: ReporterOptions) {
        this.#baseUrl = `https://${options.domain}/index.php?/api/v2`
        this.#projectId = options.projectId
        this.#config.auth = {
            username: options.username,
            password: options.apiToken
        }
    }

    async updateTestRunResults (runId: string, results: TestCase[]) {
        try {
            const resp = await axios.post(
                `${this.#baseUrl}/add_results_for_cases/${runId}`,
                { results },
                this.#config,
            )
            return resp
        } catch (err) {
            log.error(`Failed to update test run results: ${err.message}`)
        }
    }

    async updateTestRun (runId: string, case_ids: unknown[]) {
        try {
            const resp = await axios.post(
                `${this.#baseUrl}/update_run/${runId}`,
                { case_ids },
                this.#config
            )
            return resp
        } catch (err) {
            log.error(`Failed to update test run: ${err.message}`)
        }
    }

    async pushResults (testId: string, results: TestResults) {
        try {
            const resp = axios.post(
                `${this.#baseUrl}/add_result_for_case/${this.#projectId}/${testId}`,
                results,
                this.#config,
            )
            return resp
        } catch (err: any) {
            log.error(`Failed to push results: ${err.message}`)
        }
    }

    async createTestRun (test: NewTest, runName?: string): Promise<string> {
        const now = new Date()
        if (!test.name) {
            test.name = `${runName} ${now.getDate()}.${now.getMonth()} ${now.getHours()}:${now.getMinutes()}`
        }

        const resp = await axios.post(
            `${this.#baseUrl}/add_run/${this.#projectId}`,
            test,
            this.#config,
        )
        log.info(`Create new run '${test.name}' with id: ${resp.data.id}`)
        return resp.data.id
    }

    async getLastTestRun (suiteId: string, runName: string) {
        const thirtyMinAgo = new Date()
        thirtyMinAgo.setMinutes(thirtyMinAgo.getMinutes() - 30)
        const date = new Date(thirtyMinAgo)

        const unixTimeStamp = Math.floor(date.getTime() / 1000)
        try {
            const resp = await axios.get(
                `${this.#baseUrl}/get_runs/${this.#projectId}&is_completed=0&created_after=${unixTimeStamp}&suite_id=${suiteId}`,
                this.#config
            )
            const thisrun = resp.data.runs.filter(function (run: NewTest) {
                return run.name!.startsWith(runName)
            })

            const runId = thisrun.length > 0
                ? thisrun[0].id
                : await this.createTestRun({
                    suite_id: suiteId,
                    name: runName,
                    include_all: true
                })

            return runId
        } catch (err: any) {
            log.error(`Failed to get last test run: ${err.message}`)
        }
    }
}