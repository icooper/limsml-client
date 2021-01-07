# Custom LIMSML Action

If you are going to use the `SYSTEM.GET_FILE` action to try and download attachments and/or resources from a SampleManager server, you'll probably want to install this new `SYSTEM.LOGICAL` LIMSML entity action (or something similar).

## Installation Instructions

1. Add [`limsml_utils.rpf`](limsml_utils.rpf) to your SampleManager instance VGL reports and compile it.
2. Create a new LIMSML entity action by copying the _System Ping_ action, and:
   1. update the identity to `LOGICAL`,
   2. update the name to `System Logical`,
   3. update the description `Returns the value of a logical`, and
   4. rename the parameter to `LOGICAL`, set the description to `Logical to resolve`, and make it mandatory.
3. Create a new Master Menu item by copying the procedure number 15584, and:
   1. generate a new procedure number,
   2. update the description to `Returns the value of a logical`,
   3. update the VGL Library to `LIMSML_UTILS`,
   4. update the routine to `SYSTEMLOGICAL`,
   5. update the LIMSML action to `LOGICAL`, and
   6. make sure that the `USER` role is selected.
4. Restart the SampleManager WCF Service using the Windows services control panel so that the new master menu item is available via LIMSML.
