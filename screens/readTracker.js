/* eslint-disable react/self-closing-comp */
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable prettier/prettier */
import React from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View, Fragment, Li, Ul, FlatList, Alert, Modal, TextInput, AppState, Keyboard, RefreshControl, ScrollView, SafeAreaView, Picker, Dimensions, Vibration, ToolbarAndroid } from 'react-native';
import NfcManager, { Ndef, NfcEvents, NfcTech } from '../NfcManager';
import tag from './components/tag';
import about from './about';
import { Stitch, AnonymousCredential, RemoteMongoClient} from "mongodb-stitch-react-native-sdk";
import { StackNavigator, withNavigation } from 'react-navigation';
import Toast from 'react-native-simple-toast';
import  Icon  from 'react-native-vector-icons/Ionicons';
//import { ProgressBar } from 'react-native-paper';

function buildUrlPayload(valueToWrite) {
    return Ndef.encodeMessage([
        Ndef.uriRecord(valueToWrite),
    ]);
    
}

/*
Read and write are combined on this page -Eric 
I think part of the problem with it not showing up in the list was because the page 
    wasn't refreshing, so i put the add tracker stuff in a modal, which forces the page to 
    be rerendered. And merging read and write allowed me to use the add tracker function 
    directly from the writeToChip function. 
*/

global.trackerColor = 'coral';

class Read extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            supported: true,
            enabled: false,
            isWriting: false,
            parsedText: "nothing yet!",
            tag: {},
            tags: global.tags,      // Global tags is now global and local for this js page - Eric
            count: 0,
            goal: 0,
            //progress: 1,
            test: 'default',
            name: props.item,
            miraculous_something: true, //helpfulvar to update state
            modalVisible: false,
            appState: AppState.currentState,
            currentUserId: undefined,
            client: undefined,
            tagss: undefined,
            refreshing: false,
            inc: 1,
            array: undefined,
            trackers: undefined,
            //array: undefined,
            color: '#05878a',
            text: "",
            value: false,
            completed: false,
            dateCompleted: undefined,
            show: true,
            askAgain: true,
            logsTest: [],
            id: undefined,
        }
        this._loadClient = this._loadClient.bind(this);
    }
    // --------------------Testing app state ---------------------
    _handleAppStateChange = async (nextAppState) => {

        if (
          this.state.appState.match(/inactive|background/) &&
          nextAppState === 'active'
        ) {
          console.log('App has come to the foreground!');
        }else{
          console.log('app has come into background');
        }
        this.setState({appState: nextAppState});
      };



    //--------------------Testing app state -----------------------

    handleSubmit = (obj) => {
        Keyboard.dismiss();
        console.log("submitting");
        const stitchAppClient = Stitch.defaultAppClient;
        const mongoClient = stitchAppClient.getServiceClient(
          RemoteMongoClient.factory,
          "mongodb-atlas"
    
        );
        const db = mongoClient.db("LifeLog_DB");
        const trackers = db.collection("item");
        if(this.state.name != "" ){
          trackers
            .insertOne({
              status: "new",
              count: 0,
              key: this.state.name,
              name: this.state.name,
              date: new Date(),
              goal: this.state.goal, 
              description: this.state.description, 
              owner_id: global.username,
              color: this.state.color,
              progress: 0,
              dateCreated: new Date(),
              completed: false,
              dateCompleted: undefined,
              show: this.state.show,
              logs: this.state.logsTest,
            })
            .then(docs => {
              if(1){
                // put confetti here if we want it
              }
              this.setState({ value: !this.state.value});
              this.setState({ text: ""});
              //this.setState({ trackers: docs});  // changed from trackers
              this.setState({array: trackers})  // array test
              this._updateState();
            })
            .catch(err => {
              console.warn(err);
            })
        }
      };


    setModalVisible(visible) {
        this.setState({modalVisible: visible});
        Vibration.vibrate(50);
        if(!visible){
            Toast.show('Pull down to refresh', Toast.LONG); //example toast
        }
    }

    // This adds a new tracker to the current "tags" array 
    addTracker = (name) => {
        console.log(name + " is working");
        console.log("I heard you");
        if(this.isMade(name) === true){
            console.log(name + " is already here ");
            return;
        }else{
            const obj = {tagg: new tag(name, 0), key: name};
            //this.state.trackers = [...this.state.trackers, obj]; // Do not change this please, it finally works after 5 hours - Very tired Eric 
            this._updateState();
            console.log("Detected new tracker");
            Vibration.vibrate(50);
        }
    }

    trackerOptions = (item) => {
        const { navigate } = this.props.navigation; // something here isn't working Jacob make it work
        Alert.alert(
            'What would you like to do?',
            '',
            [
              {text: 'Cancel',
               onPress: () => console.log('Ask me later pressed'),
               style: 'cancel'
              },
              {
                text: 'Delete tracker',
                onPress: () => this.deleteConfirm(item),
               
              },
              {text: 'See Tracker Details',
              onPress: () => navigate("Metrics", {screen: "Metrics", tracker: item})},
             
            ],
            {cancelable: false},
          );
    }

    deleteConfirm = (key) => {
        Alert.alert(
            'Are you sure you want to delete the tracker?',
            '',
            [
              {text: 'Cancel',
               onPress: () => console.log('Ask me later pressed'),
               style: 'cancel'
              },
              {
                text: 'Yes I am sure',
                onPress: () => this._onPressDelete(key),
              },
            ],
            {cancelable: false},
          );
    }


    test(){// what is this for - Dylan
        alert('hello');
    }
    

    _updateState() {
        console.log("updating state");
        this.setState({ miraculous_something: false });
        global.recently = "readTracker.js";
        this.setState({ miraculous_something: true });
        this.render; //why does this stuff only work sometimes wtf
        return;
    }

    tagInc = (props) => {
        console.log("inc ", props.tagg.state.name, " to 1+", props.tagg.state.count);
        props.tagg.state.count = props.tagg.state.count + 1;
        this._updateState();
        
    }
    // This checks whether or not the name of the added tracker is in the array 
    isMade = (val) =>{
        console.log(val);
        return this.state.trackers.some(item => val === item.key);
    }
    
  componentDidMount = async() => { //scan tracker
    this._loadClient();
    AppState.addEventListener('change', this._handleAppStateChange);    // testing app state
    try {
        await NfcManager.registerTagEvent()
    } catch (ex) {
        console.warn('ex', ex);
        NfcManager.unregisterTagEvent().catch(() => 0);
    }
    NfcManager.start();
    NfcManager.setEventListener(NfcEvents.DiscoverTag, tags => {
        console.log('tag', tags);
        this._onTagDiscovered(tags); //writes into 'parsedText
        NfcManager.setAlertMessageIOS('I got your tag!');//probably useless
        
        // This checks to see if new tracker is in array yet, if not then it makes it
        
        this.state.trackers.map((this_tag) => {    // changed from trackers
            if (this.state.parsedText === this_tag.name) {
                Toast.show('Succesfully scanned tracker', Toast.LONG); //example toast
                this_tag.count = this_tag.count + 1;
                console.log("Tracker goal: " + this_tag.goal);
                this._onPressComplete(this_tag.count, this.state.parsedText, this_tag.goal, this_tag.logs, this_tag._id);
                //this._updateState(); // if you remove this line from here is breaks; but doesn't in tagInc???????
                console.log('Found the tag ', this.state.parsedText, ' at value' , this_tag.count);
            }
                
            });
    
        //NfcManager.unregisterTagEvent().catch(() => 0);           // commenting out this line makes NFC always listening
    });
  }

  // The logss that is passed is the current database array with a diff name, which adds the date log, and then the database array is set to the logss in the updateOne function
  _onPressComplete(newCount, name, goal, logss, itemID){
    console.log("Current count: " + newCount);
    console.log("Goal: " + goal);    
    let dateLog = new Date().getDate() + '/' + new Date().getMonth() + '/' + new Date().getFullYear() + ' ' + new Date().getHours() + ':' + new Date().getMinutes() + ':' + new Date().getSeconds();
    // Checks if user has reached their goal
    const logHopefully = [...logss, dateLog];
    //logss = [...logss, dateLog];
    //this.setState({logsTest: [...logss, dateLog]});
    let didComplete = false;
    if(goal <= newCount && !this.state.completed){
        let dateComplete = new Date().getDate() + '/' + new Date().getMonth() + '/' + new Date().getFullYear() + ' ' + new Date().getHours() + ':' + new Date().getMinutes() + ':' + new Date().getSeconds();
        this.setState({completed: true, dateCompleted: dateComplete});
        didComplete = true;
        console.log("goal reached");
        console.log("Completed on: " + dateComplete);
    }
    Vibration.vibrate(300);
    const stitchAppClient = Stitch.defaultAppClient;
    const mongoClient = stitchAppClient.getServiceClient(
      RemoteMongoClient.factory,
      "mongodb-atlas"
    );
    const db = mongoClient.db("LifeLog_DB");
    const trackers = db.collection("item");
    //const goal = trackers.goal;
    console.log("Goal is: " + goal);
    trackers 
      .updateOne(
          //{ name: name },
          { _id: itemID},
          { $set: { count: newCount, logDate: new Date(), progress: newCount*100/goal, completed: didComplete, dateCompleted: this.state.dateCompleted, logs: logHopefully}},
          { upsert: true },
          {owner_id: global.username}
      )
      .then(() => {
      trackers
            .find(
                { 
                    status: "new",
                    owner_id: global.username,
                    show: true,
                }, 
              { sort: { date: -1} }
            )
          .asArray()
          .then(docs => {
              this.setState({ trackers: docs});  // changed from tracker
              this.setState({ array: trackers});    // array test
              this._updateState();
              //this.setState({ count: newCount});
              if (this._confettiView){
                  this._confettiView.startConfetti();
              }
          })
          .catch(err => {
              console.warn(err);
          });
      })
      .catch(err => {
          console.warn(err);   
      })
    }

    _remove(name, goal){
        console.log("removing tracker");
        this.setState({show: false});
        Vibration.vibrate(300);
        const stitchAppClient = Stitch.defaultAppClient;
        const mongoClient = stitchAppClient.getServiceClient(
          RemoteMongoClient.factory,
          "mongodb-atlas"
        );
        const db = mongoClient.db("LifeLog_DB");
        const trackers = db.collection("item");
        //const goal = trackers.goal;
        trackers 
          .updateOne(
              { name: name },
              { $set: { show: this.state.show }},
              { upsert: true },
              {owner_id: global.username}
          )
          .then(() => {
          trackers
                .find(
                    { 
                        status: "new",
                        show: true,
                        owner_id: global.username,
                    }, 
                  { sort: { date: -1} }
                )
              .asArray()
              .then(docs => {
                  this.setState({ trackers: docs});  // changed from tracker
                  this.setState({ array: trackers});    // array test
                  this._updateState();
                  //this.setState({ count: newCount});
                  if (this._confettiView){
                      this._confettiView.startConfetti();
                  }
              })
              .catch(err => {
                  console.warn(err);
              });
          })
          .catch(err => {
              console.warn(err);
          })
        }


    _onPressDelete(itemID){
        const stitchAppClient = Stitch.defaultAppClient;
        const mongoClient = stitchAppClient.getServiceClient(
          RemoteMongoClient.factory,
          "mongodb-atlas"
        );
        const db = mongoClient.db("LifeLog_DB");
        const trackers = db.collection("item");
        trackers 
          .deleteOne(
              { _id: itemID },
          )
          .then(() => {
          trackers
              .find({ owner_id: global.username, show: true }, { sort: { date: -1} })
              .asArray()
              .then(docs => {
                  this.setState({ trackers: docs});  // changed from trackers
                  this.setState({ array: trackers});    // array test
                  this._updateState();
                  if (this._confettiView){
                      this._confettiView.startConfetti();
                  }
              })
              .catch(err => {
                  console.warn(err);
              });
          })
          .catch(err => {
              console.warn(err);
          })
    }

    reset(name) {
            // Checks if user has reached their goal
            Vibration.vibrate(300);
            const stitchAppClient = Stitch.defaultAppClient;
            const mongoClient = stitchAppClient.getServiceClient(
              RemoteMongoClient.factory,
              "mongodb-atlas"
            );
            const db = mongoClient.db("LifeLog_DB");
            const trackers = db.collection("item");
            trackers 
              .updateOne(
                  {name: name},
                  {$set:  {count: 0, logDate: new Date(), progress: 0 }},
                  { upsert: false },
                  {owner_id: global.username}
              )
              .then(() => {
              trackers
                    .find(
                        { 
                            status: "new",
                            owner_id: global.username,
                            show: true,
                        }, 
                      { sort: { date: -1} }
                    )
                  .asArray()
                  .then(docs => {
                      this.setState({ trackers: docs});  // changed from tracker
                      this.setState({ array: trackers});    // array test
                      this._updateState();
                      //this.setState({ count: newCount});
                      //if (this._confettiView){
                      //    this._confettiView.startConfetti();
                      //}
                  })
                  .catch(err => {
                      console.warn(err);
                  });
              })
              .catch(err => {
                  console.warn(err);   
              })
            
    }

     // Refresh shit  
     _onRefresh = () => {
        this.setState({ refreshing: true });
        const stitchAppClient = Stitch.defaultAppClient;
        const mongoClient = stitchAppClient.getServiceClient(
            RemoteMongoClient.factory,
            "mongodb-atlas"
        );
        const db = mongoClient.db("LifeLog_DB");
        const trackers = db.collection("item");
        trackers 
          .find({ owner_id: global.username, show: true }, { sort: { date: -1} })
          .asArray()
          .then(docs => {
              this.setState({ trackers: docs }); // changed from trackers
              this.setState({ refreshing: false});
              //this.setState({ array: trackers});    // array test
              this._updateState(); // added for bug fixing
          })
          .catch(err => {
              console.warn(err);
          });
        };

  componentWillUnmount() {
    AppState.removeEventListener('change', this._handleAppStateChange); // testing app state  
    //NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
    //NfcManager.unregisterTagEvent().catch(() => 0);
  }

  // Placeholder for when there are no trackers 
  ListEmpty = () => {
      
      return(
    
            <View style={{ width: '100%', paddingLeft: 5}} >
                <View style={{flexDirection: 'row', paddingTop: 7, paddingBottom: 7, backgroundColor: 'white', borderColor: '#f2f3f4'}}>
        
                    
                    
                    <View style={{ width: '95%', borderColor: '#f2f3f4', backgroundColor: 'white', borderRadius: 20, flexDirection: 'row'}} elevation={5}>
                        
                        <TouchableOpacity 
                        style={{ justifyContent: 'center', height: 200, backgroundColor: '#f2f3f4', width: '100%', borderRadius: 20, padding: 20}}
                        onPress={() => this.setModalVisible(true)}
                        >
                        <Text style={{fontFamily: 'monospace', padding: 10 }}>
                            Looks like you have no trackers!
                        </Text>
                        <Text style={{fontFamily: 'monospace', padding: 10 }}>
                            Click here or the plus sign to add one!
                        </Text>
                            
                        
                            
                        </TouchableOpacity>
        
                    </View>
                
                </View>
                
            </View>
      )
  }

  renderItem = ({item}) => {

    console.log(item.count);
    console.log("progress: " + item.progress);
    let deviceWidth = Dimensions.get('window').width;

    // Checks if goal has been reached, greys out the tracker if it has
    let itemOpacity = 0.7;
    let isCompleted = item.color;
    let iconSize = 1;
    if(item.completed){
        isCompleted = '#d1ecdc';
        itemOpacity = 0.5;
        iconSize = 25;
    }
    const { navigate } = this.props.navigation; // something here isn't working Jacob make it work
    
    
    return(
    
    <View style={{ width: '100%', paddingLeft: 5}} >
        <View style={{flexDirection: 'row', paddingTop: 7, paddingBottom: 7, backgroundColor: 'white', borderColor: item.color}}>
            {/*
            <View style={{backgroundColor: item.color, width: 15, height: 70}} elevation={5}>
                
            </View>
            */}
            
            
            
            <View style={{ width: '95%', borderColor: item.color, backgroundColor: 'white', borderRadius: 20, flexDirection: 'column', maxWidth: '95%'}} elevation={5}>
                <TouchableOpacity 
                style={{ justifyContent: 'center', height: 70, backgroundColor: '#f2f3f4', width: '100%', borderRadius: 20}}
                onPress={() => navigate("Metrics", {screen: "Metrics", tracker: item._id })}
                >
                
                <View style={{flexDirection: 'row', width: item.progress + 0.001 + '%', backgroundColor: item.color, height: 70, borderRadius: 20, maxWidth: '100%', opacity: itemOpacity}}>
                    <Text style={{flexDirection: 'row', fontFamily: 'monospace', fontWeight: 'bold', padding: 20, fontSize: 25, alignSelf: 'center', marginLeft: 10, position: 'absolute', letterSpacing: 2, maxWidth: '100%', color: '#5c5a5a' }}>
                        {item.name}
                        
                    </Text>
                    

                </View>

                <Text style={{fontFamily: 'monospace', fontWeight: 'bold', padding: 20, fontSize: 25, alignSelf: 'flex-end', position: 'absolute', justifyContent: 'flex-end', color: '#5c5a5a', opacity: itemOpacity}}>
                        {item.count}
                </Text>
                {/*
                <View style={{ alignSelf: 'flex-start',backgroundColor: 'white', borderWidth: 1, borderRadius: 100, height: 15, width: '100%', justifyContent: 'center', borderColor: item.color}}>
                
                    <View style={{backgroundColor: item.color, width: item.progress+1 + '%', height: 15, borderWidth: 1, borderRadius: 100, borderColor: item.color }}>
                    </View>
                </View>
                */}

                    
                
                    
                </TouchableOpacity>

            </View>

            {/*
            <View style={{borderTopWidth: 2, borderBottomWidth: 2, borderRightWidth: 2, borderColor: item.color, height: 50, padding: 10, backgroundColor: item.color}}>
                <Text style={{fontSize: 18}}>{item.count} / {item.goal}</Text>
            </View>
            */}
        
        </View>
        
    </View>
    )
    
    
    }


    render() {
        // This is for navigating to add tracker screen  DONT NEED BUT KEEP IN CASE WE WANT TO NAVIGATE TO ANOTHER SCREEN FROM HERE IN FUTURE 
        //const { navigate } = this.props.navigation;
        /*
        const sections = 
            this.state.trackers == undefined 
            ? [{ data: [{ title: "Loading..." }], title: "Loading..." }]
            : this.state.trackers.length > 0
            ? [{ data: this.state.trackers, title: "Current Trackers"}]
            : [
                {
                    data: [{ title: "No new trackers"}],
                    title: "No new tasks"
                }
              ];
        */
       
        return (

            

        <View style={styles.container}>
                
             
                <Modal visible={this.state.modalVisible} animationType='slide'>
                    <SafeAreaView style ={styles.modalContent}>
                    <ScrollView>
                        
                    <View style={{padding: 40}}>
                    <Text style={{fontFamily: 'monospace', fontWeight: 'bold', padding: 10, fontSize: 25, color: '#5c5a5a'}}>
                        Create a New LifeTracker
                        </Text>
                        <Text style={{fontFamily: 'monospace', fontWeight: 'bold', padding: 10, fontSize: 20,  color: '#5c5a5a'}}>
                            Name of Tracker
                            </Text>
                        <TextInput style={{height: 50, borderColor: '#5c5a5a', borderWidth: 4, fontSize: 25}} 
                            onChangeText={(text) => this.setState({name: text}) }
                        />
                          <Text style={{fontFamily: 'monospace', fontWeight: 'bold', padding: 10, fontSize: 20, color: '#5c5a5a'}}>
                              Description
                              </Text>
                         <TextInput style={{height: 80, borderColor: '#5c5a5a', borderWidth: 4, fontSize: 25}} 
                            onChangeText={(text) => this.setState({description: text}) }
                        />
                          <View style={{flexDirection: 'row', padding: 15}}>
                            <Text style={{fontFamily: 'monospace', fontWeight: 'bold', padding: 10, fontSize: 20, color: '#5c5a5a'}}>Daily Goal: </Text>
                            <Picker 
                                selectedValue={this.state.goal}
                                style={{fontFamily: 'monospace', fontWeight: 'bold',height: 50, width: 138}}
                                itemStyle = {{fontFamily: 'monospace', fontWeight: 'bold',height: 50, width: 138}}
                                onValueChange={(itemValue, itemIndex) => this.setState({goal: itemValue})}
                                >
                                    <Picker.Item label="0" value="0" color="0" />
                                    <Picker.Item label="1" value="1" color="1" />
                                    <Picker.Item label="2" value="2" color="2" />
                                    <Picker.Item label="3" value="3" color="3" />
                                    <Picker.Item label="4" value="4" color="4" />
                                    <Picker.Item label="5" value="5" color="5" />
                                    <Picker.Item label="6" value="6" color="6" />
                                    <Picker.Item label="7" value="7" color="7" />
                                    <Picker.Item label="8" value="8" color="8" />
                                    <Picker.Item label="9" value="9" color="9" />
                                    <Picker.Item label="10" value="10" color="10" />
                                    <Picker.Item label="11" value="11" color="11" />
                                    <Picker.Item label="12" value="12" color="12" />
                                    <Picker.Item label="13" value="13" color="13" />
                                    <Picker.Item label="14" value="14" color="14" />
                                    <Picker.Item label="15" value="15" color="15" />

                            </Picker>
                            
                        </View>
                        <View style={{padding: 15, width: '80%'}}>

                            <View style={{flexDirection: 'row'}}>
                                <TouchableOpacity style={{padding: 10, margin: 10, height: 30, width: 30, borderRadius: 100, backgroundColor: "#05878a"}} onPress={() => this.setState({color: "#05878a"})}/>
                                <TouchableOpacity style={{padding: 10, margin: 10, height: 30, width: 30, borderRadius: 100, backgroundColor: "#f5b7b1"}} onPress={() => this.setState({color: "#f5b7b1"})}/>
                                <TouchableOpacity style={{padding: 10, margin: 10, height: 30, width: 30, borderRadius: 100, backgroundColor: "#d7bde2"}} onPress={() => this.setState({color: "#d7bde2"})}/>
                                <TouchableOpacity style={{padding: 10, margin: 10, height: 30, width: 30, borderRadius: 100, backgroundColor: "#a9cce3"}} onPress={() => this.setState({color: "#a9cce3"})}/>
                                <TouchableOpacity style={{padding: 10, margin: 10, height: 30, width: 30, borderRadius: 100, backgroundColor: "#a3e4d7"}} onPress={() => this.setState({color: "#a3e4d7"})}/>
                                
                            </View>
                            <View style={{flexDirection: 'row'}}>
                                <TouchableOpacity style={{padding: 10, margin: 10, height: 30, width: 30, borderRadius: 100, backgroundColor: "#f9e79f"}} onPress={() => this.setState({color: "#f9e79f"})}/>
                                <TouchableOpacity style={{padding: 10, margin: 10, height: 30, width: 30, borderRadius: 100, backgroundColor: "#edbb99"}} onPress={() => this.setState({color: "#edbb99"})}/>
                                <TouchableOpacity style={{padding: 10, margin: 10, height: 30, width: 30, borderRadius: 100, backgroundColor: "#aeb6bf"}} onPress={() => this.setState({color: "#aeb6bf"})}/>
                                <TouchableOpacity style={{padding: 10, margin: 10, height: 30, width: 30, borderRadius: 100, backgroundColor: "#ec7063"}} onPress={() => this.setState({color: "#ec7063"})}/>
                                <TouchableOpacity style={{padding: 10, margin: 10, height: 30, width: 30, borderRadius: 100, backgroundColor: "#27ae60"}} onPress={() => this.setState({color: "#27ae60"})}/>
                                
                            </View>
                        </View>
                      

                        <TouchableOpacity 
                        style={{padding: 5, width: '100%', margin: 0, borderWidth: 2, borderColor: '#eee9e5', backgroundColor: '#eee9e5', borderRadius: 100, alignSelf: 'center'}}
                        onPress={this.writeToChip}
                        >
                             
                        <Text style={{fontFamily: 'monospace',color: '#5c5a5a', fontSize: 35, alignSelf: 'center', fontWeight: 'bold'}}>Add Tracker</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity //fake tracker
                        style={{padding: 5, width: '100%', margin: 25, borderWidth: 2, borderColor: '#eee9e5', backgroundColor: '#eee9e5', borderRadius: 100, alignSelf: 'center'}}
                        onPress={() => this.setModalVisible(false)}
                        >
                        <Text style={{fontFamily: 'monospace', color: '#5c5a5a', fontSize: 35, alignSelf: 'center', fontWeight: 'bold'}}>Cancel</Text>
                        </TouchableOpacity>
                        


                    </View>
                        
                    </ScrollView>
                    </SafeAreaView>

                </Modal>
                    {/*
                    <Text>current state is: {this.state.appState}</Text>
                    <Text>current user: {global.username} </Text>  
                    */}
                <FlatList
                    style={{padding: 15, flexDirection: 'column', marginTop: 10}}
                    data={this.state.trackers}   // changed from trackers
                    extraData={this.state}
                    refreshControl ={ <RefreshControl refreshing ={this.state.refreshing} onRefresh={this._onRefresh} />}
                    renderItem={this.renderItem}
                    ListEmptyComponent={this.ListEmpty}
                            /*
                            renderItem={({ item }) => (
                                //<View style={styles.tracker}>
                                <View style={{borderWidth: 1, backgroundColor: item.color, margin: 5, borderColor: item.color, padding: 5}}> 
                                    <TouchableOpacity 
                                    onPress={() => this.trackerOptions(item._id)}
                                    >
                                        <Text style={styles.trackerText}>=   {item.name} at {item.count} goal: {item.goal}</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                            */
                        />

              {/* <View style={styles.buttoncontain}>

                
                        <TouchableOpacity 
                        style={{padding: 10, width: '70%', margin: 25, borderWidth: 2, borderColor: '#eee9e5', backgroundColor: '#eee9e5', borderRadius: 100, alignSelf: 'center'}}
                        onPress={this._test}
                        >
                        <Text style={{color: 'black', fontSize: 35, alignSelf: 'center', fontWeight: 'bold'}}>SCAN</Text>
                        </TouchableOpacity>
                            </View> */}
                    
                <View style={{flexDirection: 'row', alignSelf: 'flex-end', marginRight: 50, marginBottom: 20, width: 70, height: 70, borderRadius: 100}} elevation={10}>
                    <TouchableOpacity 
                    style={{ width: 70, height: 70, borderWidth: 2, borderColor: '#f8f9f9', backgroundColor: '#f8f9f9',  alignSelf: 'center', borderRadius: 100}}
                    onPress={() => this.setModalVisible(true)}
                    >
                        <Text style={{fontSize: 40, color: 'black', margin: 0, padding: 5, alignSelf: 'center', justifyContent: 'center'}}>+</Text>
                    </TouchableOpacity> 
                </View>

                    
                
                        
      </View>
    )
  }

  _cancel = () => {
    NfcManager.unregisterTagEvent().catch(() => 0);
  }

  _test = async () => {
    console.log("This is from test");
    try {
        await NfcManager.registerTagEvent()
    } catch (ex) {
      console.warn('ex', ex);
      NfcManager.unregisterTagEvent().catch(() => 0);
      
    }
  }

    _onTagDiscovered = tag => {
        console.log('Tag Discovered', tag);
        this.setState({ tag });
        let text = this._parseText(tag);
        this.setState({ parsedText: text });
    }

    _parseUri = (tag) => {
        try {
            if (Ndef.isType(tag.ndefMessage[0], Ndef.TNF_WELL_KNOWN, Ndef.RTD_URI)) {
                return Ndef.uri.decodePayload(tag.ndefMessage[0].payload);
            }
        } catch (e) {
            console.log(e);
        }
        return null;
    }

    _parseText = (tag) => {
        try {
            if (Ndef.isType(tag.ndefMessage[0], Ndef.TNF_WELL_KNOWN, Ndef.RTD_TEXT)) {
                return Ndef.text.decodePayload(tag.ndefMessage[0].payload);
            }
        } catch (e) {
            console.log(e);
        }
        return Ndef.text.decodePayload(tag.ndefMessage[0].payload);
    }

    _loadClient() {
        const stitchAppClient = Stitch.defaultAppClient;
        const mongoClient = stitchAppClient.getServiceClient(
            RemoteMongoClient.factory,
            "mongodb-atlas"
        );
        const db = mongoClient.db("LifeLog_DB");
        const trackers = db.collection("item");
        trackers 
          .find({ owner_id: global.username,  show: true }, { sort: { date: -1} })
          .asArray()
          .then(docs => {
              this.setState({ trackers: docs }); // changed from trackers
              this.setState({ refreshing: false});
              //this.setState({ array: trackers});
              this._updateState();
              //this.setState({ array: trackers});
          })
          .catch(err => {
              console.warn(err);
          });
          
      }

    // This is from the write tracker page 
    writeToChip= async () => { //func to write to script
        try {
            Alert.alert('Scan NFC tag');
            let resp = await NfcManager.requestTechnology(NfcTech.Ndef, {
                alertMessage: 'Ready to write some NFC tags!'
            });
            //console.warn(resp);
            let ndef = await NfcManager.getNdefMessage();
            let bytes = buildUrlPayload(this.state.name); //where tag goes in
            await NfcManager.writeNdefMessage(bytes);
            Alert.alert("Successfully scanned " + '"' + this.state.name + '"');
            //Toast.show('Succesfully scanned ' + this.state.name, Toast.LONG); //example toast
            console.log("hello from writetochip");
            //this.addTracker(this.state.name);
            const obj = { tagg: new tag(this.state.name, 0), key: this.state.name, };
            //this.setState({ trackers: [...global.tags, obj]}); //this succesfully adds to the state, but it struggles to update
            this.handleSubmit(obj);
            //this.setState({ value: !this.state.value});
            this.setModalVisible(false);        // This makes it so the modal closes automatically once it writes and adds the tracker 
            await NfcManager.setAlertMessageIOS('I got your tag!');
            this._cleanUp();
            this._onRefresh();   

        } catch (ex) {
          this._cleanUp();
        }
      }
     
      _cleanUp = () => {
        NfcManager.cancelTechnologyRequest().catch(() => 0);
      }//not in use but cancels request
      

}
const styles = StyleSheet.create({

    container: {
        //padding: 20,
        width: '100%',
        //apsectRatio: 2/1,
        height: '100%',
        backgroundColor: 'white'
    },
    buttoncontain: {
        //flexDirection: 'row',
    },  
    trackerText: {
        padding: 10,
        fontSize: 20,
        color: 'white',
        fontWeight: 'bold'
    },  

    header: {
        alignSelf: 'center',
        fontSize: 40,
        color: 'white'
    },

    elementContainer: {
        flexDirection: 'row',
        alignSelf: 'center',
        marginTop: 100,
        alignContent: 'flex-end',
    },

    button: {
        backgroundColor: 'red',
        paddingLeft: 50,
    },

    numbers: {
        fontSize: 30,
        backgroundColor: '#acafb5',
        paddingLeft: 30,
        paddingRight: 30,
    },

    textinput: {
        paddingRight: 50,
        fontSize: 22,
    },

    tracker: {
        borderWidth: 1,
        padding: 5,
        //backgroundColor: '#05878a',
        backgroundColor: global.trackerColor,
        borderRadius: 100,
        margin: 5,
        borderColor: '#05878a',
        
    },
    button2: {
        fontSize: 30, 
        color: 'white', 
        margin: 5, 
        padding: 5, 
        alignSelf: 'center', 
        fontWeight: 'bold'
    },
    touch: {
        padding: 10, 
        width: 450, 
        margin: 20, 
        marginTop: 350, 
        borderWidth: 2, 
        borderColor: '#05878a', 
        backgroundColor: '#074e67',  
        alignSelf: 'center'
    },
    modalContent: {
        flex: 2,
    }

});

export default Read;