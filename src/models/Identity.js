import IdGenerator from '../util/IdGenerator'
import Account from './Account';
import Network from './Network';
import ArrayHelpers from '../util/ArrayHelpers'
import PasswordHasher from '../util/PasswordHasher'


/********************************************/
/*          Personal Information            */
/********************************************/

/* Requirable Fields for an Identity's PersonalInformation */
export const PersonalFields = {
    firstname:'firstname',
    lastname:'lastname',
    email:'email',
    birthdate:'birthdate'
};

export class PersonalInformation {
    constructor(){ Object.keys(PersonalFields).forEach(fieldName => this[fieldName] = ''); }
    static placeholder(){ return new PersonalInformation(); }
    static fromJson(json){ return Object.assign(this.placeholder(), json); }
    findFields(fields){ return fields.filter(field => this.hasOwnProperty(field) && this[field].length); }
}


/********************************************/
/*          Location Information            */
/********************************************/

/* Requirable Fields for an Identity's LocationInformation */
export const LocationFields = {
    address:'address',
    city:'city',
    state:'state',
    country:'country',
    zipcode:'zipcode'
};

export class LocationInformation {
    constructor(){ Object.keys(LocationFields).forEach(fieldName => this[fieldName] = ''); }
    static placeholder(){ return new LocationInformation(); }
    static fromJson(json){ return Object.assign(this.placeholder(), json); }
    findFields(fields){
        let foundFields = fields.filter(field => field !== LocationFields.country)
            .filter(field => this.hasOwnProperty(field) && this[field].length);

        if(fields.includes(LocationFields.country) &&
            this.hasOwnProperty('country') &&
            typeof this.country !== 'string')
            foundFields.push(LocationFields.country)

        return foundFields;
    }
}



/********************************************/
/*                 Identity                 */
/********************************************/

/* Requirable Fields for an Identity */
export const IdentityFields = {
    account:'account'
};

export default class Identity {

    constructor(){
        this.hash = IdGenerator.text(128);
        this.name = '';

        this.account = null;
        this.network = null;

        this.personal = PersonalInformation.placeholder();
        this.location = LocationInformation.placeholder();

        this.disabled = false;
    }

    static placeholder(){ return new Identity(); }
    static fromJson(json){
        let p = Object.assign(this.placeholder(), json);
        if(json.hasOwnProperty('account') && json.account) p.account = Account.fromJson(json.account);
        if(json.hasOwnProperty('network') && json.network) p.network = Network.fromJson(json.network);
        p.personal = PersonalInformation.fromJson(json.personal);
        p.location = LocationInformation.fromJson(json.location);
        return p;
    }

    clone(){ return Identity.fromJson(JSON.parse(JSON.stringify(this))) }

    /***
     * Checks if this Identity has an associated account.
     * @returns {boolean}
     */
    hasAccount(){ return this.account && this.account.hasOwnProperty('name') && this.account.name.length; }

    /***
     * Checks if an Identity has specified fields.
     * This is used when an interacting application requires specific information.
     * @param fields - The fields to check for
     * @returns {boolean}
     */
    hasRequiredFields(fields){
        let foundFields = [];

        // fields should always be lowercase and hash and name should never be searched for
        fields = fields.map(field => field.toLowerCase()).filter(field => field !== 'hash' && field !== 'name');

        if(fields.includes(IdentityFields.account) && this.hasAccount()) foundFields.push(IdentityFields.account);
        foundFields = foundFields.concat(this.personal.findFields(fields));
        foundFields = foundFields.concat(this.location.findFields(fields));
        return fields.every(field => foundFields.includes(field));
    }

    /***
     * Returns the value of a property based on the requirable name.
     * @param requirable
     */
    getPropertyValueByName(requirable){
        if(Object.keys(this).includes(requirable)) return this[requirable];
        else if(Object.keys(this.personal).includes(requirable)) return this.personal[requirable];
        else return this.location[requirable];
    }

    /***
     * * Identities should always run this before serving the identity
     * to anywhere outside of Scatter.
     * @param returnOnly - If true only returns the hash instead of binding it.
     */
    encryptHash(returnOnly = false){
        if(returnOnly) return PasswordHasher.hash(this.hash);
        else this.hash = PasswordHasher.hash(this.hash);
    }

    /***
     * Returns an object with only the required fields from this Identity
     * @param fields
     */
    asOnlyRequiredFields(fields){
        // Adding mandatory fields and converting to lowercase
        fields = ArrayHelpers.distinct(fields.map(field => field.toLowerCase()).concat(['hash', 'name', 'network']));

        const clone = {personal:{},location:{}};
        fields.map(field => {
           if(Object.keys(this).includes(field)) clone[field] = this[field];
           if(Object.keys(PersonalFields).includes(field))
               clone.personal[PersonalFields[field]] = this.personal[PersonalFields[field]];
           if(Object.keys(LocationFields).includes(field))
               clone.location[LocationFields[field]] = this.location[LocationFields[field]];
        });

        if(!Object.keys(clone.personal).length) delete clone.personal;
        if(!Object.keys(clone.location).length) delete clone.location;

        return clone;
    }

    /***
     * Checks if a name is valid
     * Names must be alphanumeric and may contain spaces, dashes, and underscores.
     * @param name - The name to validate
     * @returns {boolean}
     */
    static nameIsValid(name){
        return name.length > 3 && name.length < 20 && /^([a-zA-Z0-9 _-]+)$/.test(name)
    }
}