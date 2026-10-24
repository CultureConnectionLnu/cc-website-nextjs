import PropTypes from "prop-types";
import { HexColorPicker } from "react-colorful";
import ColorPicker from "../ColorPicker";

function LinkTreeEditor({
	links,
	newLink,
	setNewLink,
	editIndex,
	editedLink,
	setEditedLink,
	showHexColorPicker,
	setShowHexColorPicker,
	showRecommendedColorPicker,
	setShowRecommendedColorPicker,
	handleAddLink,
	handleEditLink,
	handleSaveEdit,
	handleDeleteLink,
	handleToggleEnable,
	handleMoveUp,
	handleMoveDown,
	isSaving,
}) {
	return (
		<div className="space-y-4">
			<h3 className="text-4xl text-center font-bold my-6">Link Tree Editing</h3>

			{links.map((item, index) => (
				<div key={index} className={!item.isEnabled ? "opacity-50" : ""}>
					<a
						href={item.isEnabled ? item.link : "#"}
						target="_blank"
						rel="noopener noreferrer"
						onClick={(e) => !item.isEnabled && e.preventDefault()}
						aria-disabled={!item.isEnabled}
					>
						<div
							className={`sm:w-96 w-[90%] mx-auto mt-6 text-center p-4 rounded py-3 border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-1 translate-y-1 ${
								item.color?.startsWith("#") ? "" : item.color || "bg-gray-200"
							} ${!item.isEnabled ? "cursor-not-allowed" : ""}`}
							style={
								item.color?.startsWith("#")
									? { backgroundColor: item.color }
									: {}
							}
						>
							<p
								className={`text-xl font-bold ${item.textColor || "text-black"}`}
							>
								{item.text} {!item.isEnabled && "(Disabled)"}
							</p>
						</div>
					</a>

					<div className="flex justify-center space-x-4 mt-2 p-2">
						<button
							type="button"
							onClick={() => handleEditLink(index)}
							disabled={isSaving}
							className="bg-yellow-500 text-white p-2 rounded hover:bg-yellow-600 transition-all duration-200 disabled:opacity-50"
						>
							{editIndex === index ? "Cancel" : "Edit"}
						</button>
						<button
							type="button"
							onClick={() => handleDeleteLink(index)}
							disabled={isSaving}
							className="bg-red-500 text-white p-2 rounded hover:bg-red-600 transition-all duration-200 disabled:opacity-50"
						>
							Delete
						</button>
						<button
							type="button"
							onClick={() => handleToggleEnable(index)}
							disabled={isSaving}
							className={`p-2 rounded text-white transition-all duration-200 disabled:opacity-50 ${
								item.isEnabled
									? "bg-red-500 hover:bg-red-600"
									: "bg-green-500 hover:bg-green-600"
							}`}
						>
							{item.isEnabled ? "Disable" : "Enable"}
						</button>
						<button
							type="button"
							onClick={() => handleMoveUp(index)}
							disabled={index === 0 || isSaving}
							className="bg-gray-500 text-white p-2 rounded hover:bg-gray-600 transition-all duration-200 disabled:opacity-50"
						>
							Up
						</button>
						<button
							type="button"
							onClick={() => handleMoveDown(index)}
							disabled={index === links.length - 1 || isSaving}
							className="bg-gray-500 text-white p-2 rounded hover:bg-gray-600 transition-all duration-200 disabled:opacity-50"
						>
							Down
						</button>
					</div>

					{editIndex === index && editedLink && (
						<div className="sm:w-[70%] p-2 mx-auto bg-white py-10 mt-6 rounded-lg border-2 border-black focus:outline-none placeholder">
							<h4 className="text-4xl text-center font-bold mb-2">Edit Link</h4>
							<div className="mb-4">
								<label className="block mb-2 text-center font-semibold text-lg">
									Text
								</label>
								<input
									type="text"
									value={editedLink.text}
									onChange={(e) =>
										setEditedLink({ ...editedLink, text: e.target.value })
									}
									className="sm:w-96 mx-auto flex mt-2 text-center font-bold p-4 rounded py-3 border-2 border-black focus:outline-none"
								/>
							</div>

							<div className="mb-4">
								<label className="block mb-2 text-center font-semibold text-lg">
									Link
								</label>
								<input
									type="url"
									value={editedLink.link}
									onChange={(e) =>
										setEditedLink({ ...editedLink, link: e.target.value })
									}
									className="sm:w-96 mx-auto flex mt-2 text-center font-bold p-4 rounded py-3 border-2 border-black focus:outline-none"
								/>
							</div>

							<div className="mb-4">
								<label className="block mb-2 text-center font-semibold text-lg">
									Color (Tailwind/Hex)
								</label>
								<input
									type="text"
									placeholder="e.g., bg-blue-500 or #ff00ff"
									value={editedLink.color || ""}
									onChange={(e) =>
										setEditedLink({
											...editedLink,
											color: e.target.value.trim(),
										})
									}
									className="sm:w-96 flex mx-auto mt-2 text-center font-bold p-4 rounded py-3 border-2 border-black focus:outline-none"
								/>
							</div>

							<div className="mb-4">
								<label className="block mb-2 text-center font-semibold text-lg">
									Text Color
								</label>
								<div className="flex justify-center space-x-2">
									<button
										type="button"
										onClick={() =>
											setEditedLink({ ...editedLink, textColor: "text-black" })
										}
										className={`w-48 text-center p-2 rounded py-3 bg-gray-200 border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-1 translate-y-1 ${editedLink.textColor === "text-black" ? "ring-2 ring-offset-1 ring-blue-500" : ""}`}
									>
										<p className="text-xl font-bold text-black">Black Text</p>
									</button>
									<button
										type="button"
										onClick={() =>
											setEditedLink({ ...editedLink, textColor: "text-white" })
										}
										className={`w-48 text-center p-2 rounded py-3 bg-gray-700 border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-1 translate-y-1 ${editedLink.textColor === "text-white" ? "ring-2 ring-offset-1 ring-blue-500" : ""}`}
									>
										<p className="text-xl font-bold text-white">White Text</p>
									</button>
								</div>
							</div>

							<div className="mb-6 flex justify-center items-center space-x-2">
								<input
									type="checkbox"
									id={`edit-enabled-${index}`}
									checked={editedLink.isEnabled}
									onChange={(e) =>
										setEditedLink({
											...editedLink,
											isEnabled: e.target.checked,
										})
									}
									className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
								/>
								<label
									htmlFor={`edit-enabled-${index}`}
									className="font-semibold text-lg"
								>
									Enabled
								</label>
							</div>

							<button
								type="button"
								onClick={handleSaveEdit}
								disabled={isSaving}
								className="sm:w-96 flex justify-center mx-auto mt-6 text-center p-4 rounded py-3 bg-green-400 border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-1 translate-y-1 disabled:opacity-50"
							>
								<p className="font-bold text-lg">Save Changes</p>
							</button>
						</div>
					)}
				</div>
			))}

			<div className="sm:w-[70%] w-[97%] mx-auto py-10 mt-6 focus:outline-none placeholder">
				<div className="mt-6">
					<h3 className="text-5xl text-center font-semibold mb-4">
						Add New Link
					</h3>

					<div className="mb-6">
						<a
							href={newLink.link || "#"}
							target="_blank"
							rel="noopener noreferrer"
							onClick={(e) => !newLink.link && e.preventDefault()}
						>
							<div
								className={`sm:w-96 w-[95%] mx-auto mt-6 text-center p-4 rounded py-3 border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-1 translate-y-1 ${
									newLink.color?.startsWith("#")
										? ""
										: newLink.color || "bg-gray-200"
								}`}
								style={
									newLink.color?.startsWith("#")
										? { backgroundColor: newLink.color }
										: {}
								}
							>
								<p
									className={`text-xl font-bold ${newLink.textColor || "text-black"}`}
								>
									{newLink.text || "Preview"}
								</p>
							</div>
						</a>
					</div>

					<div className="mb-4 items-center justify-center">
						<label className="block mb-2 text-center font-semibold text-lg">
							Color (Tailwind/Hex)
						</label>
						<input
							type="text"
							placeholder="e.g., bg-red-300 or #aabbcc"
							value={newLink.color}
							onChange={(e) =>
								setNewLink({ ...newLink, color: e.target.value.trim() })
							}
							className="flex sm:w-96 mt-2 text-center mx-auto font-bold p-4 rounded py-3 border-2 border-black focus:outline-none"
						/>
						<div className="flex justify-center p-3 space-x-4">
							<button
								type="button"
								onClick={() => {
									setShowHexColorPicker(!showHexColorPicker);
									setShowRecommendedColorPicker(false);
								}}
								className="w-48 mt-6 text-center p-2 bg-red-200 rounded py-3 border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-1 translate-y-1"
							>
								<p className="text-xl font-bold">Hex</p>
							</button>
							<button
								type="button"
								onClick={() => {
									setShowRecommendedColorPicker(!showRecommendedColorPicker);
									setShowHexColorPicker(false);
								}}
								className="w-48 mt-6 text-center p-2 bg-green-400 rounded py-3 border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-1 translate-y-1"
							>
								<p className="text-xl font-bold">Recommended</p>
							</button>
						</div>

						{showHexColorPicker && (
							<div className="mt-4 p-4">
								<HexColorPicker
									color={newLink.color}
									onChange={(color) => setNewLink({ ...newLink, color })}
									className="mx-auto"
								/>
								<div className="mt-2 text-center">
									<button
										type="button"
										onClick={() => setShowHexColorPicker(false)}
										className="sm:w-96 mx-auto mt-6 text-center bg-gray-300 rounded py-3 border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-1 translate-y-1"
									>
										<p className="text-xl font-bold">Close</p>
									</button>
								</div>
							</div>
						)}

						{showRecommendedColorPicker && (
							<div className="mt-4 p-4 inline-block">
								<ColorPicker
									onSelectColor={(colorClass) => {
										setNewLink({ ...newLink, color: colorClass });
									}}
								/>
								<div className="mt-2 text-center">
									<button
										type="button"
										onClick={() => setShowRecommendedColorPicker(false)}
										className="sm:w-96 mx-auto mt-6 text-center p-4 rounded py-3 bg-gray-300 border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-1 translate-y-1"
									>
										<p className="text-xl font-bold">Close</p>
									</button>
								</div>
							</div>
						)}
					</div>

					<div className="mb-4">
						<label className="block mb-2 text-center font-semibold text-lg">
							Button Text
						</label>
						<input
							type="text"
							placeholder="Text"
							value={newLink.text}
							onChange={(e) => setNewLink({ ...newLink, text: e.target.value })}
							className="placeholder flex font-bold sm:w-96 mx-auto mt-2 text-center p-4 rounded py-3 border-2 border-black focus:outline-none"
						/>
					</div>

					<div className="mb-4">
						<label className="block mb-2 text-center font-semibold text-lg">
							Text Color
						</label>
						<div className="flex justify-center space-x-2">
							<button
								type="button"
								onClick={() =>
									setNewLink({ ...newLink, textColor: "text-black" })
								}
								className={`w-48 text-center p-2 rounded py-3 bg-gray-200 border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-1 translate-y-1 ${newLink.textColor === "text-black" ? "ring-2 ring-offset-1 ring-blue-500" : ""}`}
							>
								<p className="text-xl font-bold text-black">Black Text</p>
							</button>
							<button
								type="button"
								onClick={() =>
									setNewLink({ ...newLink, textColor: "text-white" })
								}
								className={`w-48 text-center p-2 rounded py-3 bg-gray-700 border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-1 translate-y-1 ${newLink.textColor === "text-white" ? "ring-2 ring-offset-1 ring-blue-500" : ""}`}
							>
								<p className="text-xl font-bold text-white">White Text</p>
							</button>
						</div>
					</div>

					<div className="mb-4">
						<label className="block mb-2 text-center font-semibold text-lg">
							Link URL
						</label>
						<input
							type="url"
							placeholder="https://example.com"
							value={newLink.link}
							onChange={(e) => setNewLink({ ...newLink, link: e.target.value })}
							className="placeholder flex font-bold sm:w-96 mx-auto mt-2 text-center p-4 rounded py-3 border-2 border-black focus:outline-none"
						/>
					</div>

					<div className="mb-6 flex justify-center items-center space-x-2">
						<input
							type="checkbox"
							id="add-enabled"
							checked={newLink.isEnabled}
							onChange={(e) =>
								setNewLink({ ...newLink, isEnabled: e.target.checked })
							}
							className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
						/>
						<label htmlFor="add-enabled" className="font-semibold text-lg">
							Enabled
						</label>
					</div>

					<button
						type="button"
						onClick={handleAddLink}
						disabled={isSaving}
						className="flex justify-center sm:w-96 mx-auto mt-6 text-center p-4 rounded py-3 bg-blue-500 border-2 border-black shadow-custom hover:shadow-none transition-all hover:translate-x-1 translate-y-1 disabled:opacity-50"
					>
						<p className="text-xl font-bold text-white">Add Button</p>
					</button>
				</div>
			</div>
		</div>
	);
}

LinkTreeEditor.propTypes = {
	links: PropTypes.arrayOf(
		PropTypes.shape({
			color: PropTypes.string,
			text: PropTypes.string,
			link: PropTypes.string,
			textColor: PropTypes.string,
			isEnabled: PropTypes.bool,
		}),
	).isRequired,
	newLink: PropTypes.shape({
		color: PropTypes.string,
		text: PropTypes.string,
		link: PropTypes.string,
		textColor: PropTypes.string,
		isEnabled: PropTypes.bool,
	}).isRequired,
	setNewLink: PropTypes.func.isRequired,
	editIndex: PropTypes.number,
	editedLink: PropTypes.shape({
		color: PropTypes.string,
		text: PropTypes.string,
		link: PropTypes.string,
		textColor: PropTypes.string,
		isEnabled: PropTypes.bool,
	}),
	setEditedLink: PropTypes.func.isRequired,
	showHexColorPicker: PropTypes.bool.isRequired,
	setShowHexColorPicker: PropTypes.func.isRequired,
	showRecommendedColorPicker: PropTypes.bool.isRequired,
	setShowRecommendedColorPicker: PropTypes.func.isRequired,
	handleAddLink: PropTypes.func.isRequired,
	handleEditLink: PropTypes.func.isRequired,
	handleSaveEdit: PropTypes.func.isRequired,
	handleDeleteLink: PropTypes.func.isRequired,
	handleToggleEnable: PropTypes.func.isRequired,
	handleMoveUp: PropTypes.func.isRequired,
	handleMoveDown: PropTypes.func.isRequired,
	isSaving: PropTypes.bool.isRequired,
};

export default LinkTreeEditor;
