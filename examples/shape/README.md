# Echo Example

In this example, two Percolator instances at `./alpha` and `./beta` are initialized.

Alpha is initialized with a handler that logs everything it receives to the console.

Beta is initialized with a handler that logs all Volcanos (nodes that validate the start shape of the `./Volcano.shex` schema) to the console, and echoes all non-volcanos back to the sender.

Alpha is initialized first, with no bootstrap peers. Beta is initialized second, with Alpha as its only bootstrap peer. After Beta is initialized, two messages - one volcano, and a second non-volcano - are send from Alpha to Beta.
