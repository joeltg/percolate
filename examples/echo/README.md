# Echo Example

In this example, two Percolator instances at `./alpha` and `./beta` are initialized.

Alpha is given a handler that logs everything it receives to the console.

Beta is given a handler that echoes everything it receives back to the sender.

Alpha is initialized first, with no bootstrap peers. Beta is initialized second, with Alpha as its only bootstrap peer. After Beta is initialized, a message is sent from Alpha to Beta.
