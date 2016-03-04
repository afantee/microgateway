'use strict';

var logger = require('apiconnect-cli-logger/logger.js')
               .child({loc: 'apiconnect-microgateway:policies:operation-switch'});

/**
 *  Returns a new operation-switch policy function
 *
 *  @param config {Object} contains 3 properties:
 *    - operationId:  the context var name for retrievinig API operation ID
 *    - verb: the context var name for retrieving the API operation method
 *    - path: the context var name for retriving the API operation path
 */
module.exports = function (config) {
    return function (props, context, flow) {
        var logger  = flow.logger;

        function resume() {
            logger.info('[operation-switch] Subflow is complete');
            flow.proceed();
        }

        var actualOpId = context.get('_.api.operationId');
        var actualVerb = context.get('_.api.operation').toLowerCase();
        var actualPath = context.get('_.api.path');
        logger.info('[operation-switch] Matching %s %s (%s)',
                actualVerb, actualPath, actualOpId);

        var subflow;
        for (var c in props.case) {
            var curr = props.case[c];
            for (var idx in curr.operations) {
                var expect = curr.operations[idx];
                if (typeof expect === 'string') {
                    if (expect === actualOpId) {
                        subflow = curr.execute;
                        break;
                    }
                }
                else if (typeof expect === 'object') {
                    if (expect.verb.toLowerCase() === actualVerb &&
                            expect.path === actualPath) {
                        subflow = curr.execute;
                        break;
                    }
                }
            }
            if (subflow)
                break;
        }

        if (subflow) {
            logger.info('[operation-switch] Operation matched. Executing the subflow');
            flow.invoke({ execute: subflow}, resume);
        }
        else {
            logger.info('[operation-switch] No operation matched. Skip the policy');
            flow.proceed();
        }
    };
};
