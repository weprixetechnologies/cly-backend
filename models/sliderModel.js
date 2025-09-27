const db = require('../utils/dbconnect');

// Create a new desktop slider
async function createDesktopSlider(sliderData) {
    try {
        const { imgUrl } = sliderData;

        const [result] = await db.execute(
            `INSERT INTO sliderDesktop (imgUrl) VALUES ('${imgUrl}')`
        );

        return {
            sliderID: result.insertId,
            insertId: result.insertId,
            affectedRows: result.affectedRows
        };
    } catch (error) {
        throw new Error(`Error creating desktop slider: ${error.message}`);
    }
}

// Create a new mobile slider
async function createMobileSlider(sliderData) {
    try {
        const { imgUrl } = sliderData;

        const [result] = await db.execute(
            `INSERT INTO sliderMobile (imgUrl) VALUES ('${imgUrl}')`
        );

        return {
            sliderID: result.insertId,
            insertId: result.insertId,
            affectedRows: result.affectedRows
        };
    } catch (error) {
        throw new Error(`Error creating mobile slider: ${error.message}`);
    }
}

// Get all desktop sliders
async function getAllDesktopSliders() {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM sliderDesktop ORDER BY createdAt DESC'
        );
        return rows;
    } catch (error) {
        throw new Error(`Error fetching desktop sliders: ${error.message}`);
    }
}

// Get all mobile sliders
async function getAllMobileSliders() {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM sliderMobile ORDER BY createdAt DESC'
        );
        return rows;
    } catch (error) {
        throw new Error(`Error fetching mobile sliders: ${error.message}`);
    }
}

// Get desktop slider by ID
async function getDesktopSliderById(sliderID) {
    try {
        const [rows] = await db.execute(
            `SELECT * FROM sliderDesktop WHERE sliderID = ${sliderID}`
        );
        return rows[0] || null;
    } catch (error) {
        throw new Error(`Error fetching desktop slider: ${error.message}`);
    }
}

// Get mobile slider by ID
async function getMobileSliderById(sliderID) {
    try {
        const [rows] = await db.execute(
            `SELECT * FROM sliderMobile WHERE sliderID = ${sliderID}`
        );
        return rows[0] || null;
    } catch (error) {
        throw new Error(`Error fetching mobile slider: ${error.message}`);
    }
}

// Update desktop slider
async function updateDesktopSlider(sliderID, sliderData) {
    try {
        const { imgUrl } = sliderData;

        const [result] = await db.execute(
            `UPDATE sliderDesktop SET imgUrl = '${imgUrl}', updatedAt = CURRENT_TIMESTAMP WHERE sliderID = ${sliderID}`
        );

        return {
            affectedRows: result.affectedRows,
            changedRows: result.changedRows
        };
    } catch (error) {
        throw new Error(`Error updating desktop slider: ${error.message}`);
    }
}

// Update mobile slider
async function updateMobileSlider(sliderID, sliderData) {
    try {
        const { imgUrl } = sliderData;

        const [result] = await db.execute(
            `UPDATE sliderMobile SET imgUrl = '${imgUrl}', updatedAt = CURRENT_TIMESTAMP WHERE sliderID = ${sliderID}`
        );

        return {
            affectedRows: result.affectedRows,
            changedRows: result.changedRows
        };
    } catch (error) {
        throw new Error(`Error updating mobile slider: ${error.message}`);
    }
}

// Delete desktop slider
async function deleteDesktopSlider(sliderID) {
    try {
        const [result] = await db.execute(
            `DELETE FROM sliderDesktop WHERE sliderID = ${sliderID}`
        );
        return {
            affectedRows: result.affectedRows
        };
    } catch (error) {
        throw new Error(`Error deleting desktop slider: ${error.message}`);
    }
}

// Delete mobile slider
async function deleteMobileSlider(sliderID) {
    try {
        const [result] = await db.execute(
            `DELETE FROM sliderMobile WHERE sliderID = ${sliderID}`
        );
        return {
            affectedRows: result.affectedRows
        };
    } catch (error) {
        throw new Error(`Error deleting mobile slider: ${error.message}`);
    }
}

module.exports = {
    createDesktopSlider,
    createMobileSlider,
    getAllDesktopSliders,
    getAllMobileSliders,
    getDesktopSliderById,
    getMobileSliderById,
    updateDesktopSlider,
    updateMobileSlider,
    deleteDesktopSlider,
    deleteMobileSlider
};
