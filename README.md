# ewdGateway2
 
Node.js-based EWD Gateway for Cach&#233;, GlobalsDB and GT.M

Rob Tweed <rtweed@mgateway.com>  
10 January 2013, M/Gateway Developments Ltd [http://www.mgateway.com](http://www.mgateway.com)  

Twitter: @rtweed

Google Group for discussions, support, advice etc: [http://groups.google.co.uk/group/enterprise-web-developer-community](http://groups.google.co.uk/group/enterprise-web-developer-community)

Thanks to Stephen Chadwick for enhancements and modifications

## Installing ewdGateway2

       npm install ewdgateway2



..or copy the files from the lib directory of this repository into your working Node.js directory

Note that socket.io will also be installed for you. 

If you are using GT.M you must install David Wicksell's [NodeM] (https://github.com/dlwicksell/nodem) interface package.

If you are using Cach&#233;, ewdGateway2 uses its native Node.js interface (available since 
Cach&#233; 2012.2, but it can be back-ported for use with earlier Cach&#233; versions)
	   
##EWD Lite

ewdGateway2 now includes support for an entirely WebSocket-based subset of the EWD framework known as EWD Lite.  
Unlike the full EWD framework, EWD Lite does not
require anything other than the ewdGateway2 module: it is an entirely JavaScript-based framework and
methodology and can work with
the free GlobalsDB database [http://globalsdb.org](http://globalsdb.org), in addition to GT.M and Cach&#233;

##Standard EWD

The *ewdGateway2* module is compatible with EWD build 963 or later


##  EWD Gateway

The *ewdGateway2* module provides a multi-purpose web application gateway for EWD applications.  
Functionality includes:

- web server
- web server gateway to the major Mumps databases (GT.M, GlobalsDB and Cach&#233;), 
  pre-configured for running EWD applications;
- websockets middle-tier connecting browsers to GT.M, GlobalsDB or Cach&#233;, pre-configured for the EWD 
  Realtime and EWD Lite functionality;
- integrated OO access to Mumps data storage from Javascript/Node.js, allowing Mumps databases to be
  used as persistent JSON storage

The *ewdGateway2* module can be used as a replacement for a standard web server such as IIS or Apache, and no other
 gateway technology is required.  The *ewdGateway2* module automatically makes *child_process* connections 
to your GT.M, GlobalsDB or Cach&#233; database, the number of connections being determined by the *poolSize* 
that you specify.

For further details about the EWD web application framework for GT.M and Cach&#233;, see [http://www.mgateway.com/ewd.html](http://www.mgateway.com/ewd.html)



## License

 Copyright (c) 2013 M/Gateway Developments Ltd,                           
 Reigate, Surrey UK.                                                      
 All rights reserved.                                                     
                                                                           
  http://www.mgateway.com                                                  
  Email: rtweed@mgateway.com                                               
                                                                           
                                                                           
  Licensed under the Apache License, Version 2.0 (the "License");          
  you may not use this file except in compliance with the License.         
  You may obtain a copy of the License at                                  
                                                                           
      http://www.apache.org/licenses/LICENSE-2.0                           
                                                                           
  Unless required by applicable law or agreed to in writing, software      
  distributed under the License is distributed on an "AS IS" BASIS,        
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. 
  See the License for the specific language governing permissions and      
   limitations under the License.      
