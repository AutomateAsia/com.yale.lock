# Yale Digital Lock

Adds support for Yale Digital Locks

Currently supports EU version of the following devices:

1. YRD220
2. YDD424
3. YFM40
4. YDM4109
5. YDM3168
6. YKFCON
7. YD-01-CON

## Notes:
1. YDM316, YKFCON and YD-01-CON was added based on request on Github. We do not have the lock for testing. Please log the issues to https://github.com/AutomateAsia/com.yale.lock
2. YFM40, YDM3168 and YDM4109 does not send status update upon locking by thumbturn. This is not a Homey issue as they behave the same as the Z-Wave hub like Vera and FIBARO.
3. Fingerprint unlock does not send status update to any Z-Wave hub. This is not a Homey issue as they behave the same as the Z-Wave hub like Vera and FIBARO.
4. This app will make Homey poll on fixed interval (60s) now to address point 3 and 4. The setting page will be make available in following releases.
5. Refer to https://h4sh.automate.asia/blogs/guides-and-reviews/decoding-yale-z-Wave-lock-with-homey for more technical details.

## Flow cards support following triggers:
1. Lock/Unlock by thumb turn (for YDM4109, YDM3168 and YFM40, the lock does not seems to send status update on locking by thumbturn)
2. Lock/Unlock by touchpad
3. Unlock by specific user pin (the lock does not send status update for fingerprint unlock)
4. Lock/Unlock by button (only for YDD424)
5. Autolocked (only for locks that have mechanism to detect door closed, i.e YDD424 has a magnet, YFM40, YDM3168 and YDM4109 has a spring latch)
6. Tamper alarm

## Changelog:  

### v1.0.3
* Added support for YDM4109, YDM3168, YKFCON and YKFCON     
* Fixed typo on YFM40  
* Updated inclusion instructions  
* Group some of the product ID, product type ID into different locks. Re-inclusion may be required for some users.      

### v1.0.0
* App store release
