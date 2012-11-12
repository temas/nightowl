# Night Owl #

Night Owl is a simple monitoring and alerting system.  It uses remote 
agents, direct connections and metrics systems to make decisions on 
alerting.

## Server ##

The server has the main configuration and makes decisions about the state
of machines to either warn or alert ops.

### Monitors ###

Warn and Alert set the levels that they would take action on.  They usually 
take a metric level, but can also take a function that is called with the 
current metric level and can return a true or false on whether it should 
trigger.

## Agent ##

A basic stat gatherer for a remote machine


