// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title AIMarketPlace
 */
contract AIMarketPlace {
    using Counters for Counters.Counter;
    Counters.Counter public totalModel;

    address private admin;
    uint256 private creditrate;

    struct model {
        string modelname;
        string cid;
        uint256 fee;
        address verifier;
        address creator;
        bool status;
    }

    struct modelUse {
        string modelname;
        uint256 onChainRequest;
        uint256 offChainRequest;
        uint256 totalRequest;
        uint256 totalAmount;
        bool status;
    }

    struct modelArray {
        string[] modelname;
    }

    struct modelUseArray {
        string[] uuid;
    }

    string[] public allModels;
    mapping(address=>modelArray) creatorListOfModel;
    mapping(address=>modelUseArray) userListOfModel;
    mapping (string=>modelUse) uuidToUseModel;
    mapping(string=>model) modelObj;
    mapping(string=>uint256) public modelUseCount;

    constructor() {
        admin = msg.sender;
        creditrate = 100000000000000; //0.0001 FTX
    }

    function createModel(string memory _modelname,string memory _cid,uint256 _fee,address _verifier) public {
        require(!modelObj[_modelname].status,'Model name is already exists.Please use another model name.');
        modelObj[_modelname] = model({
            modelname:_modelname,
            cid:_cid,
            fee:_fee,
            verifier:_verifier,
            creator: msg.sender,
            status: true
        });

        creatorListOfModel[msg.sender].modelname.push(_modelname);
        allModels.push(_modelname);
        totalModel.increment();
    }

    // function updateVerifier(string memory _modelname,address _verifier) public {
    //     require(modelObj[_modelname].creator == msg.sender,'You are not creator of the model');
    //     modelObj[_modelname].verifier = _verifier;
    // }

    function useModel(string memory _modelname,string memory _uuid) public payable {
        require(!uuidToUseModel[_uuid].status,'Model is already purchased by you');
        require(modelObj[_modelname].status,'Model name is not exists.Please use another model');
        require(modelObj[_modelname].fee == msg.value,'Required minimum fee amount');
        uuidToUseModel[_uuid] = modelUse({
            modelname: _modelname,
            onChainRequest: 0,
            offChainRequest: 0,
            totalRequest: 10,
            totalAmount: 0,
            status:true
        });

        modelUseCount[_modelname] += 1;

        userListOfModel[msg.sender].uuid.push(_uuid);
    }

    function buyCredit(string memory _uuid, uint256 _newCredit) public payable {
        require(uuidToUseModel[_uuid].status,'Model name is not exists.Please use another model');
        require(msg.value >= _newCredit * creditrate ,'You do not have enough amount to buy required credits');
        uuidToUseModel[_uuid].totalRequest += _newCredit;
        uuidToUseModel[_uuid].totalAmount += (_newCredit * creditrate);

    }

    function getCreatorModel(address _creator) public view returns(string[] memory) {
        return(creatorListOfModel[_creator].modelname);
    }

    function getUserModel(address _user) public view returns(string[] memory) {
        return(userListOfModel[_user].uuid);
    }

    function getDetailsUUID(string memory _uuid) public view returns(modelUse memory) {
        return(uuidToUseModel[_uuid]);
    }

    function getModel(string memory _modelname) public view returns(model memory) {
        return(modelObj[_modelname]);
    }

    function updateCreditRate(uint256 _creditrate) public {
        require(admin == msg.sender,'You are not admin of the contract');
        creditrate = _creditrate;
    }

}