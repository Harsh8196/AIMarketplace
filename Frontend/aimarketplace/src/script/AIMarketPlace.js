import web3 from './web3_'
import AIMarketPlaceAbi from '../abi/AIMarketPlace.json'


const instance = new web3.eth.Contract(AIMarketPlaceAbi.abi,process.env.REACT_APP_CONTRACT_ADDRESS)  
// console.log(instance)

export default instance