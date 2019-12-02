const LocalStrategy = require('passport-local').Strategy;

const bcrypt = require('bcrypt');

function initialize(passport, getUserByName, getUserById) {
    const authenticateUser = async (name, pwd, done) => {
        const user = getUserByName(name);
        // console.log(`pwd:${pwd}\npwd:${user.password}`);
        if (user == null) {
            //          error user     msg
            return done(null, false, { message: 'no user with that name found'});
        }else{
            try {
                if (await bcrypt.compare(pwd, user.password)) {
                    
                    return done(null, user);
                }else{
                    return done(null, false, { message: 'password incorrect'});
                }
            } catch (error) {
                return done(error);
            }   
        }
    };

    passport.use(new LocalStrategy({ usernameField: 'name' }, authenticateUser));

    passport.serializeUser((user, done) => { done(null, user._id)});
    passport.deserializeUser((id, done) => {
        done(null, getUserById(id))
    });
}



module.exports = initialize;