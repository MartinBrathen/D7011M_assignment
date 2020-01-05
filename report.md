# Report

## Architecture

We have one server running nodejs with a mongodb database. It provides a REST interface, known as the simulator, and a web app
for prosumers. The web app for managers has not yet been implemented.

The prosumer web app retrieves data from the simulator's REST interface, that is then displayed to the user.
