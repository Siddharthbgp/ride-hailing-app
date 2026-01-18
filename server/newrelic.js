'use strict'

/**
 * New Relic agent configuration.
 *
 * See lib/config/default.js in the agent distribution for a more complete
 * description of configuration variables and their potential values.
 */
exports.config = {
    /**
     * Array of application names.
     */
    app_name: [process.env.NEW_RELIC_APP_NAME || 'GoComet-Ride-Hailing-App'],

    /**
     * Your New Relic license key.
     */
    license_key: process.env.NEW_RELIC_LICENSE_KEY || 'YOUR_LICENSE_KEY_HERE',

    /**
     * Logging configuration
     */
    logging: {
        /**
         * Level at which to log. 'trace' is most useful to New Relic when diagnosing
         * issues with the agent, 'info' and higher will impose the least overhead on
         * production applications.
         */
        level: process.env.NEW_RELIC_LOG_LEVEL || 'info',

        /**
         * Where to put the log file
         */
        filepath: 'stdout'
    },

    /**
     * When true, all request headers except for those listed in attributes.exclude
     * will be captured for all traces, unless otherwise specified in a destination's
     * attributes include/exclude lists.
     */
    allow_all_headers: true,

    /**
     * Attributes configuration
     */
    attributes: {
        /**
         * Prefix of attributes to exclude from all destinations. Allows * as wildcard
         * at end.
         */
        exclude: [
            'request.headers.cookie',
            'request.headers.authorization',
            'request.headers.proxyAuthorization',
            'request.headers.setCookie*',
            'request.headers.x*',
            'response.headers.cookie',
            'response.headers.authorization',
            'response.headers.proxyAuthorization',
            'response.headers.setCookie*',
            'response.headers.x*'
        ]
    },

    /**
     * Transaction tracer configuration
     */
    transaction_tracer: {
        /**
         * Whether to collect & submit slow transaction traces to New Relic. The
         * instrumentation is loaded regardless of this setting, as it's necessary
         * to gather metrics. Disable the agent to prevent the instrumentation from
         * loading.
         */
        enabled: true,

        /**
         * Threshold (in milliseconds) at which a transaction trace will be generated.
         */
        transaction_threshold: process.env.NEW_RELIC_TRACER_THRESHOLD || 'apdex_f',

        /**
         * Whether to generate a backtrace for slow SQL queries
         */
        record_sql: 'obfuscated',

        /**
         * Threshold (in milliseconds) at which to collect a stack trace for a SQL call
         */
        explain_threshold: 500
    },

    /**
     * Error collector configuration
     */
    error_collector: {
        /**
         * Whether to collect & submit error traces to New Relic.
         */
        enabled: true,

        /**
         * List of HTTP error status codes the error tracer should disregard.
         */
        ignore_status_codes: [400, 401, 404],

        /**
         * Whether to capture request parameters on errors
         */
        capture_events: true,

        /**
         * Maximum number of error events to send per minute
         */
        max_event_samples_stored: 100
    },

    /**
     * Browser monitoring configuration
     */
    browser_monitoring: {
        /**
         * Enable browser monitoring
         */
        enable: false
    },

    /**
     * Application logging configuration
     */
    application_logging: {
        /**
         * Toggles whether the agent gathers log records for sending to New Relic.
         */
        enabled: true,

        /**
         * Toggles whether the agent will capture log records emitted by your application.
         */
        forwarding: {
            enabled: true,
            max_samples_stored: 10000
        },

        /**
         * Toggles whether the agent will enrich application logs with New Relic
         * linking metadata.
         */
        local_decorating: {
            enabled: true
        },

        /**
         * Sub-feature of application logging. Toggles whether the agent will
         * collect metrics data about logs seen.
         */
        metrics: {
            enabled: true
        }
    },

    /**
     * Distributed tracing configuration
     */
    distributed_tracing: {
        /**
         * Enables/disables distributed tracing.
         */
        enabled: true
    },

    /**
     * Slow SQL queries configuration
     */
    slow_sql: {
        enabled: true,
        max_samples: 10
    },

    /**
     * Custom instrumentation configuration
     */
    custom_insights_events: {
        enabled: true,
        max_samples_stored: 10000
    },

    /**
     * Custom parameters for all transactions
     */
    custom_parameters_enabled: true,

    /**
     * Infinite tracing configuration (optional - requires Trace Observer)
     */
    infinite_tracing: {
        trace_observer: {
            host: process.env.NEW_RELIC_INFINITE_TRACING_TRACE_OBSERVER_HOST || ''
        }
    },

    /**
     * Labels for the application (optional)
     */
    labels: {
        environment: process.env.NODE_ENV || 'development',
        team: 'backend',
        service: 'ride-hailing'
    }
}
